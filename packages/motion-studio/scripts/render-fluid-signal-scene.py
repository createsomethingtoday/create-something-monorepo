#!/usr/bin/env python3
"""Build and render one continuous, physically coherent Signal Decision Proof scene."""

from __future__ import annotations

import argparse
import math
import subprocess
import sys
import tempfile
from pathlib import Path

import bpy
from mathutils import Vector


FPS = 24
FRAME_END = 480


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-blend", type=Path, required=True)
    parser.add_argument("--stills-dir", type=Path)
    parser.add_argument(
        "--frames",
        default="1,48,96,144,228,240,252,300,336,360,390,432,480",
    )
    parser.add_argument("--video-out", type=Path)
    parser.add_argument("--audio", type=Path)
    separator = sys.argv.index("--") if "--" in sys.argv else len(sys.argv) - 1
    return parser.parse_args(sys.argv[separator + 1 :])


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (
        bpy.data.materials,
        bpy.data.curves,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for item in list(collection):
            collection.remove(item)


def input_if_present(node: bpy.types.Node, name: str, value: object) -> None:
    socket = node.inputs.get(name)
    if socket is not None:
        socket.default_value = value


def material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    metallic: float = 0,
    roughness: float = 0.35,
    transmission: float = 0,
    ior: float = 1.45,
    coat: float = 0,
) -> bpy.types.Material:
    result = bpy.data.materials.new(name)
    result.diffuse_color = color
    result.use_nodes = True
    principled = result.node_tree.nodes.get("Principled BSDF")
    input_if_present(principled, "Base Color", color)
    input_if_present(principled, "Metallic", metallic)
    input_if_present(principled, "Roughness", roughness)
    input_if_present(principled, "Transmission Weight", transmission)
    input_if_present(principled, "IOR", ior)
    input_if_present(principled, "Coat Weight", coat)
    input_if_present(principled, "Alpha", color[3])
    if color[3] < 1:
        result.surface_render_method = "BLENDED"
    return result


def add_micro_surface(target: bpy.types.Material, *, strength: float) -> None:
    nodes = target.node_tree.nodes
    links = target.node_tree.links
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 42
    noise.inputs["Detail"].default_value = 3
    noise.inputs["Roughness"].default_value = 0.55
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = strength
    bump.inputs["Distance"].default_value = 0.018
    principled = nodes.get("Principled BSDF")
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], principled.inputs["Normal"])


def add_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    surface: bpy.types.Material,
    *,
    bevel: float = 0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("Physical edge radius", "BEVEL")
        modifier.width = bevel
        modifier.segments = 5
    obj.data.materials.append(surface)
    return obj


def add_cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    surface: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=48,
        radius=radius,
        depth=depth,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(surface)
    return obj


def aim_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def key_location(
    obj: bpy.types.Object,
    frames: list[tuple[int, tuple[float, float, float]]],
) -> None:
    for frame, location in frames:
        obj.location = location
        obj.keyframe_insert(data_path="location", frame=frame)


def key_scale(
    obj: bpy.types.Object,
    frames: list[tuple[int, tuple[float, float, float]]],
) -> None:
    for frame, scale in frames:
        obj.scale = scale
        obj.keyframe_insert(data_path="scale", frame=frame)


def key_rotation_z(obj: bpy.types.Object, frames: list[tuple[int, float]]) -> None:
    for frame, angle in frames:
        obj.rotation_euler.z = angle
        obj.keyframe_insert(data_path="rotation_euler", frame=frame, index=2)


def moving_conveyor_material() -> bpy.types.Material:
    result = material(
        "Moving optic conveyor belt",
        (0.46, 0.51, 0.56, 1),
        metallic=0.18,
        roughness=0.32,
        coat=0.12,
    )
    nodes = result.node_tree.nodes
    links = result.node_tree.links
    coordinates = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.name = "Conveyor belt travel"
    wave = nodes.new("ShaderNodeTexWave")
    wave.wave_type = "BANDS"
    wave.bands_direction = "X"
    wave.inputs["Scale"].default_value = 12.0
    wave.inputs["Distortion"].default_value = 0.08
    wave.inputs["Detail"].default_value = 1.0
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.46
    ramp.color_ramp.elements[0].color = (0.34, 0.38, 0.42, 1)
    ramp.color_ramp.elements[1].position = 0.54
    ramp.color_ramp.elements[1].color = (0.53, 0.57, 0.61, 1)
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.1
    bump.inputs["Distance"].default_value = 0.012
    principled = nodes.get("Principled BSDF")
    links.new(coordinates.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], wave.inputs["Vector"])
    links.new(wave.outputs["Color"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], principled.inputs["Base Color"])
    links.new(wave.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], principled.inputs["Normal"])

    travel = mapping.inputs["Location"]
    for frame, x in ((1, 0), (48, 0), (144, -4.47), (252, -4.47), (360, -9), (432, -9), (480, -9)):
        travel.default_value[0] = x
        travel.keyframe_insert(data_path="default_value", frame=frame, index=0)
    return result


def add_camera(
    name: str,
    *,
    lens: float,
    fstop: float,
    camera_frames: list[tuple[int, tuple[float, float, float]]],
    target_frames: list[tuple[int, tuple[float, float, float]]],
) -> bpy.types.Object:
    bpy.ops.object.camera_add(location=camera_frames[0][1])
    camera = bpy.context.object
    camera.name = name
    camera.data.type = "PERSP"
    camera.data.lens = lens
    camera.data.sensor_width = 35.9
    camera.data.dof.use_dof = True
    camera.data.dof.aperture_fstop = fstop
    camera.data["lens_reference"] = (
        "Sony FE 100mm f/2.8 Macro GM OSS" if lens == 100 else f"{lens:g}mm cinematic context lens"
    )

    target = bpy.data.objects.new(f"{name} target", None)
    bpy.context.collection.objects.link(target)
    target.empty_display_type = "PLAIN_AXES"
    constraint = camera.constraints.new(type="TRACK_TO")
    constraint.target = target
    constraint.track_axis = "TRACK_NEGATIVE_Z"
    constraint.up_axis = "UP_Y"
    camera.data.dof.focus_object = target
    key_location(camera, camera_frames)
    key_location(target, target_frames)
    return camera


def configure_scene() -> bpy.types.Scene:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = FRAME_END
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"

    world = scene.world or bpy.data.worlds.new("Performance Lab World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.0015, 0.0025, 0.0045, 1)
    background.inputs["Strength"].default_value = 0.12
    return scene


def build_scene() -> bpy.types.Scene:
    clear_scene()
    scene = configure_scene()

    black = material(
        "Machined onyx",
        (0.008, 0.011, 0.015, 1),
        metallic=0.32,
        roughness=0.2,
        coat=0.2,
    )
    dark_floor = material(
        "Near-black studio floor",
        (0.006, 0.008, 0.012, 1),
        metallic=0.05,
        roughness=0.34,
    )
    optic_white = material(
        "Optic-white channel floor",
        (0.72, 0.76, 0.80, 1),
        metallic=0.12,
        roughness=0.24,
        coat=0.18,
    )
    conveyor = moving_conveyor_material()
    acrylic = material(
        "Clear acrylic",
        (0.82, 0.89, 0.96, 0.08),
        roughness=0.12,
        transmission=0.0,
        ior=1.49,
        coat=0.7,
    )
    steel = material(
        "Brushed sensor steel",
        (0.24, 0.28, 0.32, 1),
        metallic=0.72,
        roughness=0.28,
    )
    cobalt = material(
        "Cobalt anodized aluminum",
        (0.003, 0.028, 0.55, 1),
        metallic=0.5,
        roughness=0.25,
        coat=0.28,
    )
    add_micro_surface(cobalt, strength=0.045)
    porcelain = material(
        "Warm proof porcelain",
        (0.82, 0.85, 0.87, 1),
        metallic=0,
        roughness=0.22,
        coat=0.22,
    )
    mark = material(
        "Recessed proof mark",
        (0.12, 0.16, 0.20, 1),
        metallic=0.25,
        roughness=0.42,
    )

    add_box("Studio floor", (0, 0, -0.28), (19, 12, 0.5), dark_floor, bevel=0.05)
    add_box("Continuous conveyor deck", (0, 0, 0.09), (12.5, 2.25, 0.16), optic_white, bevel=0.04)
    add_box("Moving conveyor belt", (0, 0, 0.23), (11.65, 1.86, 0.20), conveyor, bevel=0.09)
    add_box("Front acrylic wall", (0, -1.12, 0.78), (12.5, 0.075, 1.45), acrylic, bevel=0.035)
    add_box("Rear acrylic wall", (0, 1.12, 0.78), (12.5, 0.075, 1.45), acrylic, bevel=0.035)
    add_box("Terminal acrylic wall", (6.22, 0, 0.78), (0.075, 2.25, 1.45), acrylic, bevel=0.035)

    for index, x in enumerate([(-5.55 + step * 0.48) for step in range(24)]):
        add_box(
            f"Calibration mark {index + 1:02d}",
            (x, -0.98, 0.245),
            (0.025, 0.22, 0.018),
            black,
            bevel=0.004,
        )

    for name, x in (("Conveyor inlet roller", -5.7), ("Conveyor outlet roller", 5.7)):
        roller = add_cylinder(name, (x, 0, 0.04), 0.28, 1.88, steel)
        roller.rotation_euler.x = math.pi / 2
        bpy.context.view_layer.objects.active = roller
        roller.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        roller.select_set(False)
        key_rotation_z(
            roller,
            [
                (1, 0),
                (48, 0),
                (144, -math.tau * 2.3),
                (252, -math.tau * 2.3),
                (360, -math.tau * 4.6),
                (432, -math.tau * 4.6),
                (480, -math.tau * 4.6),
            ],
        )

    add_box("Gate front column", (0, -1.38, 1.25), (0.72, 0.52, 2.45), black, bevel=0.07)
    add_box("Gate rear column", (0, 1.38, 1.25), (0.72, 0.52, 2.45), black, bevel=0.07)
    add_box("Gate top beam", (0, 0, 2.15), (0.72, 3.08, 0.56), black, bevel=0.07)

    for index, y in enumerate([(-0.88 + step * 0.22) for step in range(9)]):
        slat = add_box(
            f"Physical gate slat {index + 1:02d}",
            (-0.03, y, 1.03),
            (0.17, 0.12, 1.62),
            steel,
            bevel=0.025,
        )
        key_location(
            slat,
            [
                (1, (-0.03, y, 1.03)),
                (228, (-0.03, y, 1.03)),
                (252, (-0.03, y, 2.06)),
                (480, (-0.03, y, 2.06)),
            ],
        )
        key_scale(
            slat,
            [
                (1, (1, 1, 1)),
                (228, (1, 1, 1)),
                (252, (1, 1, 0.08)),
                (480, (1, 1, 0.08)),
            ],
        )

    add_cylinder("Sensor mast", (0, 0, 3.05), 0.055, 1.45, steel)
    add_cylinder("Sensor mast foot", (0, 0, 2.34), 0.18, 0.12, black)
    sensor = add_box("Physical decision sensor", (0, 0, 3.75), (0.36, 0.3, 0.52), steel, bevel=0.04)
    sensor_frames: list[tuple[int, tuple[float, float, float]]] = [(1, (0, 0, 3.75)), (164, (0, 0, 3.75))]
    for pulse in (168, 192, 216):
        sensor_frames.extend(
            [
                (pulse, (0, 0, 3.86)),
                (pulse + 3, (0, 0, 3.75)),
            ]
        )
    sensor_frames.append((480, (0, 0, 3.75)))
    key_location(sensor, sensor_frames)

    cube = add_box("Single cobalt work packet", (-5.25, 0, 0.91), (1.18, 1.02, 1.12), cobalt, bevel=0.11)
    key_location(
        cube,
        [
            (1, (-5.25, 0, 0.91)),
            (48, (-5.25, 0, 0.91)),
            (144, (-0.86, 0, 0.91)),
            (252, (-0.86, 0, 0.91)),
            (360, (3.40, 0, 0.91)),
            (480, (3.40, 0, 0.91)),
        ],
    )

    add_box("Proof fixture", (4.9, 0, 0.36), (1.38, 0.72, 0.24), acrylic, bevel=0.07)
    receipt = add_box("Physical proof receipt", (5.0, 0, -0.62), (1.05, 0.15, 1.55), porcelain, bevel=0.065)
    key_location(
        receipt,
        [
            (1, (5.0, 0, -0.62)),
            (360, (5.0, 0, -0.62)),
            (432, (5.0, 0, 1.05)),
            (480, (5.0, 0, 1.05)),
        ],
    )
    proof_mark = add_box("Cobalt proof inset", (5.0, -0.082, -0.4), (0.22, 0.025, 0.22), cobalt, bevel=0.025)
    key_location(
        proof_mark,
        [
            (1, (5.0, -0.082, -0.4)),
            (360, (5.0, -0.082, -0.4)),
            (432, (5.0, -0.082, 1.25)),
            (480, (5.0, -0.082, 1.25)),
        ],
    )

    shot_packet = add_camera(
        "Shot 1 - 100mm ground macro packet",
        lens=100,
        fstop=2.8,
        camera_frames=[(1, (-9.0, -15.8, 2.25)), (120, (-8.35, -14.6, 2.05))],
        target_frames=[(1, (-3.45, 0, 0.92)), (120, (-2.15, 0, 0.94))],
    )
    shot_context = add_camera(
        "Shot 2 - 50mm spatial decision context",
        lens=50,
        fstop=4.0,
        camera_frames=[(121, (-9.8, -18.3, 4.1)), (252, (-8.7, -17.2, 3.6))],
        target_frames=[(121, (-0.8, 0, 0.82)), (252, (0.1, 0, 0.88))],
    )
    shot_action = add_camera(
        "Shot 3 - 85mm gate action",
        lens=85,
        fstop=3.2,
        camera_frames=[(253, (-3.0, -14.2, 2.55)), (360, (-1.4, -13.1, 2.25))],
        target_frames=[(253, (0.05, 0, 0.93)), (360, (2.75, 0, 0.98))],
    )
    shot_proof = add_camera(
        "Shot 4 - 100mm monumental proof hero",
        lens=100,
        fstop=2.8,
        camera_frames=[(361, (0.6, -13.2, 2.45)), (432, (1.45, -11.8, 2.05)), (480, (1.45, -11.8, 2.05))],
        target_frames=[(361, (4.0, 0, 0.92)), (432, (4.45, 0, 1.14)), (480, (4.45, 0, 1.14))],
    )
    for frame, name, camera in (
        (1, "Signal - 100mm macro", shot_packet),
        (121, "Decision - 50mm context", shot_context),
        (253, "Action - 85mm gate", shot_action),
        (361, "Proof - 100mm hero", shot_proof),
    ):
        scene.timeline_markers.new(name, frame=frame).camera = camera
    scene.camera = shot_packet

    for name, location, energy, size, target in (
        ("Hard raking key", (-6.5, -7.5, 12.5), 1450, 4.8, (0, 0, 0.4)),
        ("Cool rear edge", (5.5, 4.5, 8.5), 520, 5.0, (1.5, 0, 0.8)),
        ("Low tunnel fill", (-1.5, -2.0, 4.5), 210, 4.0, (0, 0, 0.3)),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        aim_at(light, Vector(target))

    return scene


def render_stills(scene: bpy.types.Scene, directory: Path, frames: list[int]) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    for frame in frames:
        markers = [marker for marker in scene.timeline_markers if marker.camera and marker.frame <= frame]
        if markers:
            scene.camera = max(markers, key=lambda marker: marker.frame).camera
        scene.frame_set(frame)
        scene.render.filepath = str(directory / f"frame-{frame:04d}.png")
        bpy.ops.render.render(write_still=True)


def render_video(scene: bpy.types.Scene, output: Path, audio: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="signal-proof-frames-") as temporary:
        frames = Path(temporary)
        scene.render.image_settings.file_format = "PNG"
        scene.render.image_settings.color_mode = "RGB"
        scene.render.filepath = str(frames / "frame-")
        scene.frame_set(1)
        bpy.ops.render.render(animation=True)
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-v",
                "error",
                "-framerate",
                str(FPS),
                "-start_number",
                "1",
                "-i",
                str(frames / "frame-%04d.png"),
                "-i",
                str(audio),
                "-map",
                "0:v:0",
                "-map",
                "1:a:0",
                "-vf",
                "noise=alls=3:allf=t+u:all_seed=20260719,format=yuv420p",
                "-c:v",
                "libx264",
                "-preset",
                "slow",
                "-crf",
                "18",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-movflags",
                "+faststart",
                "-t",
                "20",
                str(output),
            ],
            check=True,
        )


def main() -> None:
    args = parse_args()
    scene = build_scene()
    args.out_blend.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(args.out_blend))

    if args.stills_dir:
        frames = [int(value.strip()) for value in args.frames.split(",") if value.strip()]
        render_stills(scene, args.stills_dir, frames)
    if args.video_out:
        if not args.audio:
            raise ValueError("--audio is required with --video-out")
        render_video(scene, args.video_out, args.audio)


if __name__ == "__main__":
    main()
