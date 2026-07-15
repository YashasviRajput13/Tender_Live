import asyncio
import json
import logging
from typing import AsyncGenerator
import redis.asyncio as aioredis
from config import settings

logger = logging.getLogger(__name__)


class RedisPubSubManager:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.client = None
        self.redis_unavailable = False
        self.local_channels: dict[str, list[asyncio.Queue]] = {}

    async def get_client(self) -> aioredis.Redis:
        if self.client is None:
            self.client = aioredis.from_url(self.redis_url, decode_responses=True)

        try:
            await self.client.ping()
            self.redis_unavailable = False
            return self.client
        except Exception as e:
            logger.error(f"Redis connection failed: {str(e)}")
            self.redis_unavailable = True
            self.client = None
            raise

    async def _publish_local(self, channel: str, payload: dict):
        queues = self.local_channels.get(channel, [])
        for queue in list(queues):
            try:
                await queue.put(payload)
            except Exception:
                logger.warning(
                    f"Failed to deliver local SSE payload to channel {channel}"
                )

    async def publish(self, channel: str, event_type: str, data: dict):
        """
        Publish an event to a Redis channel.
        Format matches SSE specifications: {event: event_type, data: data}
        """
        payload = {"event": event_type, "data": data}

        try:
            rc = await self.get_client()
            await rc.publish(channel, json.dumps(payload))
        except Exception as e:
            logger.error(f"Failed to publish event to {channel}: {str(e)}")
            self.redis_unavailable = True
            self.client = None
            await self._publish_local(channel, payload)

    async def subscribe(self, channel: str) -> AsyncGenerator[str, None]:
        """
        Subscribe to a Redis channel and yield SSE messages.
        """
        try:
            rc = await self.get_client()
            pubsub = rc.pubsub()
            await pubsub.subscribe(channel)
        except Exception as e:
            logger.error(f"Redis subscribe failed: {str(e)}")
            queue: asyncio.Queue = asyncio.Queue()
            self.local_channels.setdefault(channel, []).append(queue)

            try:
                yield ": ping\n\n"
                while True:
                    try:
                        payload = await asyncio.wait_for(queue.get(), timeout=2.0)
                        event_name = payload.get("event", "message")
                        event_data = payload.get("data", {})
                        yield f"event: {event_name}\n"
                        yield f"data: {json.dumps(event_data)}\n\n"
                    except asyncio.TimeoutError:
                        yield ": ping\n\n"
                    except asyncio.CancelledError:
                        break
            finally:
                channels = self.local_channels.get(channel, [])
                if queue in channels:
                    channels.remove(queue)
                return

        try:
            # Yield initial keep-alive comment
            yield ": ping\n\n"

            while True:
                # Read message with a small timeout to allow checking task cancellation
                try:
                    message = await pubsub.get_message(
                        ignore_subscribe_messages=True, timeout=1.0
                    )
                    if message:
                        raw_data = message.get("data")
                        if raw_data:
                            payload = json.loads(raw_data)
                            event_name = payload.get("event", "message")
                            event_data = payload.get("data", {})

                            # Format as SSE event
                            yield f"event: {event_name}\n"
                            yield f"data: {json.dumps(event_data)}\n\n"
                    else:
                        # Send keep-alive to keep connection open
                        yield ": ping\n\n"
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(
                        f"Error reading from Redis channel {channel}: {str(e)}"
                    )
                    yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
                    await asyncio.sleep(2)
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()


# Global manager instance
sse_manager = RedisPubSubManager(settings.REDIS_URL)


async def trigger_task_update(
    task_id: str,
    progress: int,
    status: str,
    agent: str,
    message: str,
    logs: list = None,
):
    """
    Helper function to publish a task state update both to individual task stream and general dashboard stream.
    """
    event_data = {
        "task_id": task_id,
        "progress": progress,
        "status": status,
        "current_agent": agent,
        "message": message,
        "logs": logs or [],
    }

    # 1. Publish to specific task channel
    await sse_manager.publish(f"task:{task_id}", "progress", event_data)

    # 2. Publish to general dashboard activity channel
    dashboard_log = {
        "timestamp": datetime_to_string(),
        "level": "INFO" if status != "failed" else "ERROR",
        "message": f"[{agent.upper()}] {message}",
    }
    await sse_manager.publish(
        "dashboard_events",
        "activity_log",
        {
            "task_id": task_id,
            "progress": progress,
            "status": status,
            "agent": agent,
            "log": dashboard_log,
        },
    )


def datetime_to_string():
    from datetime import datetime

    return datetime.utcnow().strftime("%H:%M:%S")
