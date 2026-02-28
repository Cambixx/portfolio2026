import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { useInView } from 'motion/react';
import * as THREE from 'three';

const AntigravityInner = ({
    count = 400,
    magnetRadius = 8,
    ringRadius = 10,
    waveSpeed = 0.2,
    waveAmplitude = 0.8,
    particleSize = 0.8,
    lerpSpeed = 0.03,
    autoAnimate = false,
    particleVariance = 1.1,
    rotationSpeed = 0.05,
    depthFactor = 1.5,
    pulseSpeed = 2,
    fieldStrength = 8
}) => {
    const meshRef = useRef(null);
    const colorArray = useMemo(() => new Float32Array(count * 3), [count]);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Google Antigravity Palette
    const palette = useMemo(() => [
        new THREE.Color('#5227FF'), // Purple
        new THREE.Color('#4285F4'), // Google Blue
        new THREE.Color('#F06292'), // Pink/Coral
        new THREE.Color('#FFAB40'), // Orange
        new THREE.Color('#FFFFFF'), // White
    ], []);

    const lastMousePos = useRef({ x: 0, y: 0 });
    const lastMouseMoveTime = useRef(0);
    const virtualMouse = useRef({ x: 0, y: 0 });

    const [particles] = useState(() => {
        const temp = [];
        const width = 40; // Units in R3F view space (0..50)
        const height = 40;

        for (let i = 0; i < count; i++) {
            const t = Math.random() * 100;
            const speed = 0.01 + Math.random() / 300;

            const x = (Math.random() - 0.5) * width * 1.5;
            const y = (Math.random() - 0.5) * height * 1.5;
            const z = (Math.random() - 0.5) * 10;

            const randomRadiusOffset = (Math.random() - 0.5) * 3;

            // Assign random color
            const color = palette[Math.floor(Math.random() * palette.length)];
            color.toArray(colorArray, i * 3);

            temp.push({
                t,
                speed,
                mx: x,
                my: y,
                mz: z,
                cx: x,
                cy: y,
                cz: z,
                randomRadiusOffset
            });
        }
        return temp;
    }); // initialized once via useState

    useFrame(state => {
        const mesh = meshRef.current;
        if (!mesh) return;

        const { viewport: v, pointer: m } = state;

        const mouseDist = Math.sqrt(Math.pow(m.x - lastMousePos.current.x, 2) + Math.pow(m.y - lastMousePos.current.y, 2));

        if (mouseDist > 0.001) {
            lastMouseMoveTime.current = Date.now();
            lastMousePos.current = { x: m.x, y: m.y };
        }

        let destX = (m.x * v.width) / 2;
        let destY = (m.y * v.height) / 2;

        if (autoAnimate && Date.now() - lastMouseMoveTime.current > 2000) {
            const time = state.clock.getElapsedTime();
            destX = Math.sin(time * 0.3) * (v.width / 4);
            destY = Math.cos(time * 0.2) * (v.height / 4);
        }

        const smoothFactor = 0.04;
        virtualMouse.current.x += (destX - virtualMouse.current.x) * smoothFactor;
        virtualMouse.current.y += (destY - virtualMouse.current.y) * smoothFactor;

        const targetX = virtualMouse.current.x;
        const targetY = virtualMouse.current.y;

        const globalRotation = state.clock.getElapsedTime() * rotationSpeed;

        particles.forEach((particle, i) => {
            let { t, speed, mx, my, mz, cz, randomRadiusOffset } = particle;

            t = particle.t += speed / 2;

            const projectionFactor = 1 - cz / 60;
            const projectedTargetX = targetX * projectionFactor;
            const projectedTargetY = targetY * projectionFactor;

            const dx = mx - projectedTargetX;
            const dy = my - projectedTargetY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let targetPos = { x: mx, y: my, z: mz * depthFactor };

            if (dist < magnetRadius) {
                const angle = Math.atan2(dy, dx) + globalRotation;
                const wave = Math.sin(t * waveSpeed + angle) * (0.8 * waveAmplitude);
                const deviation = randomRadiusOffset * (6 / (fieldStrength + 0.1));
                const currentRingRadius = ringRadius + wave + deviation;

                targetPos.x = projectedTargetX + currentRingRadius * Math.cos(angle);
                targetPos.y = projectedTargetY + currentRingRadius * Math.sin(angle);
                targetPos.z = mz * depthFactor + Math.sin(t) * (2 * waveAmplitude * depthFactor);
            }

            particle.cx += (targetPos.x - particle.cx) * lerpSpeed;
            particle.cy += (targetPos.y - particle.cy) * lerpSpeed;
            particle.cz += (targetPos.z - particle.cz) * lerpSpeed;

            dummy.position.set(particle.cx, particle.cy, particle.cz);
            dummy.lookAt(projectedTargetX, projectedTargetY, particle.cz);
            dummy.rotateX(Math.PI / 2);

            const currentDistToMouse = Math.sqrt(
                Math.pow(particle.cx - projectedTargetX, 2) + Math.pow(particle.cy - projectedTargetY, 2)
            );

            const distFromRing = Math.abs(currentDistToMouse - ringRadius);
            let scaleFactor = 1 - distFromRing / 12;
            scaleFactor = Math.max(0.2, Math.min(1, scaleFactor));

            const finalScale = scaleFactor * (0.9 + Math.sin(t * pulseSpeed) * 0.2 * particleVariance) * particleSize;
            dummy.scale.set(finalScale, finalScale, finalScale);

            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        });

        mesh.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[null, null, count]}>
            <capsuleGeometry args={[0.04, 0.6, 2, 6]}>
                <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
            </capsuleGeometry>
            <meshBasicMaterial vertexColors />
        </instancedMesh>
    );
};

const Antigravity = props => {
    const containerRef = useRef(null);
    const inView = useInView(containerRef, { amount: 0.1 });

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
            <Canvas
                frameloop={inView ? 'always' : 'demand'}
                dpr={[1, 1.5]}
                camera={{ position: [0, 0, 50], fov: 35 }}
                style={{ pointerEvents: 'none' }}
                eventSource={typeof document !== 'undefined' ? document.getElementById('root') : undefined}
                eventPrefix="client"
            >
                <AntigravityInner {...props} />
            </Canvas>
        </div>
    );
};

export default Antigravity;
