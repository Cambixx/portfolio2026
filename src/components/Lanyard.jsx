/* eslint-disable react/no-unknown-property */
import { useEffect, useRef, useState } from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import { useGLTF, useTexture, Environment, Lightformer } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';

// Import assets directly using Vite's path resolution
import cardGLB from '../assets/lanyard/card.glb';
import lanyardTexture from '../assets/lanyard/lanyard.png';

import * as THREE from 'three';
import './Lanyard.css';

extend({ MeshLineGeometry, MeshLineMaterial });

export default function Lanyard({
    position = [0, 0, 30],
    gravity = [0, -40, 0],
    fov = 20,
    transparent = true,
    cardImage,
    lanyardImage
}) {
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="lanyard-wrapper">
            <Canvas
                camera={{ position: position, fov: fov }}
                dpr={[1, isMobile ? 1.5 : 2]}
                gl={{ alpha: transparent }}
                onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)}
            >
                <ambientLight intensity={Math.PI} />
                <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
                    <Band isMobile={isMobile} cardImage={cardImage} lanyardImage={lanyardImage} />
                </Physics>
                <Environment blur={0.75}>
                    <Lightformer
                        intensity={2}
                        color="white"
                        position={[0, -1, 5]}
                        rotation={[0, 0, Math.PI / 3]}
                        scale={[100, 0.1, 1]}
                    />
                    <Lightformer
                        intensity={3}
                        color="white"
                        position={[-1, -1, 1]}
                        rotation={[0, 0, Math.PI / 3]}
                        scale={[100, 0.1, 1]}
                    />
                    <Lightformer
                        intensity={3}
                        color="white"
                        position={[1, 1, 1]}
                        rotation={[0, 0, Math.PI / 3]}
                        scale={[100, 0.1, 1]}
                    />
                    <Lightformer
                        intensity={10}
                        color="white"
                        position={[-10, 0, 14]}
                        rotation={[0, Math.PI / 2, Math.PI / 3]}
                        scale={[100, 10, 1]}
                    />
                </Environment>
            </Canvas>
        </div>
    );
}

function Band({ maxSpeed = 50, minSpeed = 0, isMobile = false, cardImage, lanyardImage }) {
    const band = useRef(),
        fixed = useRef(),
        j1 = useRef(),
        j2 = useRef(),
        j3 = useRef(),
        card = useRef();
    const vec = new THREE.Vector3(),
        ang = new THREE.Vector3(),
        rot = new THREE.Vector3(),
        dir = new THREE.Vector3();
    const segmentProps = { type: 'dynamic', canSleep: true, colliders: false, angularDamping: 4, linearDamping: 4 };

    // Use pre-loaded assets
    const { nodes, materials } = useGLTF(cardGLB);

    // Default textures
    const defaultLanyardTexture = useTexture(lanyardTexture);

    // Optional override textures
    const cardOverrideTexture = cardImage ? useTexture(cardImage) : null;
    const lanyardOverrideTexture = lanyardImage ? useTexture(lanyardImage) : null;

    // Fix rotation for override textures (upside down fix)
    useEffect(() => {
        if (cardOverrideTexture) {
            cardOverrideTexture.center.set(0.5, 0.5);
            cardOverrideTexture.rotation = Math.PI;
        }
    }, [cardOverrideTexture]);

    // Final textures to use
    const finalCardTexture = cardOverrideTexture || materials.base.map;
    const finalLanyardTexture = lanyardOverrideTexture || defaultLanyardTexture;

    const [curve] = useState(
        () =>
            new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()])
    );
    const [dragged, drag] = useState(false);
    const [hovered, hover] = useState(false);

    useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
    useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
    useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
    useSphericalJoint(j3, card, [
        [0, 0, 0],
        [0, 1.5, 0]
    ]);

    useEffect(() => {
        if (hovered) {
            document.body.style.cursor = dragged ? 'grabbing' : 'grab';
            return () => void (document.body.style.cursor = 'auto');
        }
    }, [hovered, dragged]);

    useFrame((state, delta) => {
        if (dragged) {
            vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
            dir.copy(vec).sub(state.camera.position).normalize();
            vec.add(dir.multiplyScalar(state.camera.position.length()));
            [card, j1, j2, j3, fixed].forEach(ref => ref.current?.wakeUp());
            card.current?.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z });
        }
        if (fixed.current) {
            [j1, j2].forEach(ref => {
                if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
                const clampedDistance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())));
                ref.current.lerped.lerp(
                    ref.current.translation(),
                    delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
                );
            });
            curve.points[0].copy(j3.current.translation());
            curve.points[1].copy(j2.current.lerped);
            curve.points[2].copy(j1.current.lerped);
            curve.points[3].copy(fixed.current.translation());
            band.current.geometry.setPoints(curve.getPoints(isMobile ? 16 : 32));
            // Automatic Flip Logic - Only when NOT dragging
            if (!dragged) {
                const time = state.clock.getElapsedTime();
                const shouldFlip = Math.floor(time / 5) % 2 === 1;
                const targetRotY = shouldFlip ? Math.PI : 0;

                ang.copy(card.current.angvel());
                rot.copy(card.current.rotation());

                // Use sin difference for shortest path and smoother torque
                const rotDiff = Math.sin(rot.y - targetRotY);

                card.current.setAngvel({
                    x: ang.x * 0.95, // Dampen X/Z to stabilize during flip
                    y: ang.y - rotDiff * 0.25,
                    z: ang.z * 0.95
                });
            }
        }
    });

    curve.curveType = 'chordal';
    if (finalLanyardTexture) {
        finalLanyardTexture.wrapS = finalLanyardTexture.wrapT = THREE.RepeatWrapping;
    }

    return (
        <>
            <group position={[0, 4, 0]}>
                <RigidBody ref={fixed} {...segmentProps} type="fixed" />
                <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
                    <BallCollider args={[0.1]} />
                </RigidBody>
                <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
                    <BallCollider args={[0.1]} />
                </RigidBody>
                <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
                    <BallCollider args={[0.1]} />
                </RigidBody>
                <RigidBody position={[2, 0, 0]} ref={card} {...segmentProps} type={dragged ? 'kinematicPosition' : 'dynamic'}>
                    <CuboidCollider args={[0.8, 1.125, 0.01]} />
                    <group
                        scale={2.25}
                        position={[0, -1.2, -0.05]}
                        onPointerOver={() => hover(true)}
                        onPointerOut={() => hover(false)}
                        onPointerUp={e => (e.target.releasePointerCapture(e.pointerId), drag(false))}
                        onPointerDown={e => (
                            e.target.setPointerCapture(e.pointerId),
                            drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())))
                        )}
                    >
                        <mesh geometry={nodes.card.geometry}>
                            <meshPhysicalMaterial
                                map={finalCardTexture}
                                map-anisotropy={16}
                                clearcoat={isMobile ? 0 : 1}
                                clearcoatRoughness={0.15}
                                roughness={0.9}
                                metalness={0.8}
                            />
                        </mesh>
                        <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
                        <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
                    </group>
                </RigidBody>
            </group>
            <mesh ref={band}>
                <meshLineGeometry />
                <meshLineMaterial
                    color="white"
                    depthTest={false}
                    resolution={isMobile ? [1000, 2000] : [1000, 1000]}
                    useMap
                    map={finalLanyardTexture}
                    repeat={[-4, 1]}
                    lineWidth={1}
                />
            </mesh>
        </>
    );
}
