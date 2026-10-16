"use client";

import { motion, AnimatePresence } from "framer-motion";
import { WIcon } from "./WIcon";

interface LoadingOverlayProps {
    visible: boolean;
    message: string;
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="wf-overlay"
                    role="status"
                    aria-live="polite"
                >
                    <motion.div
                        className="wf-overlay-card"
                        initial={{ opacity: 0, y: 14, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="wf-spinner">
                            <span><WIcon name="spark" size={20} /></span>
                        </div>
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.h3
                                key={message}
                                className="wf-overlay-title"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.25 }}
                            >
                                {message}
                            </motion.h3>
                        </AnimatePresence>
                        <p className="wf-sub" style={{ margin: 0, fontSize: 13.5 }}>Estamos procesando tu solicitud…</p>
                        <span className="mono" style={{ fontSize: 8.5 }}>NO CIERRES ESTA VENTANA</span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
