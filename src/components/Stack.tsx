import type { MotionProps } from "framer-motion";
import { motion } from "framer-motion";

const variants = {
  hidden: {
    opacity: 0,
    rotateY: 180
  },
  enter: {
    opacity: 1,
    rotateY: 0
  },
  exit: {
    opacity: 0,
    rotateY: -180
  }
};

export interface StackProps
  extends MotionProps,
    React.RefAttributes<HTMLSelectElement> {
  readonly children: React.ReactNode;
}

export const Stack: React.FC<StackProps> = ({ children, ...props }) => (
  <motion.section
    {...props}
    variants={variants}
    initial="hidden"
    animate="enter"
    exit="exit"
    transition={{ type: `tween` }}
  >
    {children}
  </motion.section>
);
