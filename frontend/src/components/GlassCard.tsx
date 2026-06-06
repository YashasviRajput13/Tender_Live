import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => (
  <motion.div
    className={`glass-panel ${className} p-6`}
    whileHover={{ y: -4, scale: 1.02, boxShadow: '0 8px 25px rgba(230,185,140,0.2)' }}
    transition={{ type: 'spring', stiffness: 200 }}
  >
    {children}
  </motion.div>
);
