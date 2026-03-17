"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const Leaf = ({ delay }: { delay: number }) => {
    // Valores aleatórios para cada folha
    const randomX = Math.random() * 100; // Posição horizontal inicial (0-100%)
    const randomDuration = 10 + Math.random() * 15; // Duração da queda (10-25s)
    const randomRotation = Math.random() * 360;
    const size = 15 + Math.random() * 20; // Tamanho entre 15px e 35px

    return (
        <motion.div
            initial={{
                y: -50,
                x: `${randomX}vw`,
                rotate: randomRotation,
                opacity: 0
            }}
            animate={{
                y: "110vh",
                x: `${randomX + (Math.random() * 20 - 10)}vw`, // Balanço lateral
                rotate: randomRotation + 720,
                opacity: [0, 1, 1, 0] // Fade in no topo, fade out no fundo
            }}
            transition={{
                duration: randomDuration,
                repeat: Infinity,
                delay: delay,
                ease: "linear",
            }}
            className="fixed pointer-events-none z-0"
            style={{
                fontSize: `${size}px`,
                color: "#2d5a27", // Cor verde folha
            }}
        >
            🍃
        </motion.div>
    );
};

export const FallingLeaves = ({ count = 15 }) => {
    const [leaves, setLeaves] = useState<number[]>([]);

    useEffect(() => {
        // Gerar IDs únicos para as folhas
        setLeaves(Array.from({ length: count }, (_, i) => i));
    }, [count]);

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0">
            {leaves.map((id) => (
                <Leaf key={id} delay={Math.random() * 20} />
            ))}
        </div>
    );
};