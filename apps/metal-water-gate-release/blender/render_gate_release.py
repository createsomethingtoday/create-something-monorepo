#!/usr/bin/env python3
"""Render the immutable Metal SPH field as one Blender Performance scene."""

import argparse
import hashlib
import json
import math
import os
import pathlib
import sys
import time
import traceback

import bpy
from mathutils import Vector

SCRIPT_DIRECTORY = pathlib.Path(__file__).resolve().parent
if str(SCRIPT_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIRECTORY))

from render_profile import get_profile


def parse_arguments():
    arguments = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--field", required=True)
    parser.add_argument("--expected-field-sha256", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--receipt", required=True)
    parser.add_argument("--save-blend")
    parser.add_argument("--width", type=int, default=320)
    parser.add_argument("--height", type=int, default=180)
    parser.add_argument("--samples", type=int, default=32)
    parser.add_argument("--frames", default="0,72,73,120,156,191")
    parser.add_argument("--profile", choices=("legacy-v1", "hero-v2"), default="legacy-v1")
    parser.add_argument("--engine", choices=("eevee", "cycles"), default="eevee")
    return parser.parse_args(arguments)


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for data in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                 bpy.data.cameras, bpy.data.lights):
        for item in list(data):
            if item.users == 0:
                data.remove(item)


def configure_engine(scene, args):
    if args.engine == "cycles":
        scene.render.engine = "CYCLES"
        scene.cycles.samples = args.samples
        scene.cycles.use_denoising = True
        scene.cycles.preview_samples = min(args.samples, 16)
        scene.cycles.use_preview_denoising = True
        scene.cycles.device = "GPU"
        preferences = bpy.context.preferences.addons["cycles"].preferences
        preferences.compute_device_type = "METAL"
        preferences.refresh_devices()
        for device in preferences.devices:
            device.use = device.type == "METAL"
    else:
        scene.render.engine = "BLENDER_EEVEE"
        if hasattr(scene, "eevee"):
            scene.eevee.taa_render_samples = args.samples


def set_input(node, names, value):
    for name in names:
        if name in node.inputs:
            node.inputs[name].default_value = value
            return


def material(name, color, metallic=0.0, roughness=0.4,
             transmission=0.0, emission=None):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    result.diffuse_color = (*color, 1.0)
    bsdf = result.node_tree.nodes.get("Principled BSDF")
    set_input(bsdf, ["Base Color"], (*color, 1.0))
    set_input(bsdf, ["Metallic"], metallic)
    set_input(bsdf, ["Roughness"], roughness)
    set_input(bsdf, ["IOR"], 1.333 if transmission else 1.45)
    set_input(bsdf, ["Transmission Weight", "Transmission"], transmission)
    set_input(bsdf, ["Coat Weight", "Clearcoat"], 0.25 if transmission else 0.05)
    if emission:
        emission_color, strength = emission
        set_input(bsdf, ["Emission Color", "Emission"], (*emission_color, 1.0))
        set_input(bsdf, ["Emission Strength"], strength)
    return result


def add_water_microstructure(water_material):
    """Add deterministic macro relief while preserving the Metal field geometry."""
    nodes = water_material.node_tree.nodes
    links = water_material.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.name = "Deterministic water microstructure"
    noise.noise_dimensions = "3D"
    set_input(noise, ["Scale"], 22.0)
    set_input(noise, ["Detail"], 5.0)
    set_input(noise, ["Roughness"], 0.58)
    bump = nodes.new("ShaderNodeBump")
    bump.name = "Macro water relief"
    set_input(bump, ["Strength"], 0.17)
    set_input(bump, ["Distance"], 0.055)
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])


def add_brushed_microstructure(assigned_material, scale=58.0, strength=0.11):
    nodes = assigned_material.node_tree.nodes
    links = assigned_material.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.name = "Machined microstructure"
    noise.noise_dimensions = "3D"
    set_input(noise, ["Scale"], scale)
    set_input(noise, ["Detail"], 2.0)
    set_input(noise, ["Roughness"], 0.42)
    bump = nodes.new("ShaderNodeBump")
    bump.name = "Machined relief"
    set_input(bump, ["Strength"], strength)
    set_input(bump, ["Distance"], 0.018)
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])


def add_water_absorption(water_material):
    nodes = water_material.node_tree.nodes
    links = water_material.node_tree.links
    output = nodes.get("Material Output")
    absorption = nodes.new("ShaderNodeVolumeAbsorption")
    absorption.name = "Cobalt depth absorption"
    absorption.inputs["Color"].default_value = (0.002, 0.045, 0.34, 1.0)
    absorption.inputs["Density"].default_value = 3.2
    links.new(absorption.outputs["Volume"], output.inputs["Volume"])


def add_cube(name, location, dimensions, assigned_material, bevel=0.025):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if assigned_material:
        obj.data.materials.append(assigned_material)
    if bevel:
        modifier = obj.modifiers.new(name="Performance edge", type="BEVEL")
        modifier.width = bevel
        modifier.segments = 3
    return obj


def add_cylinder(name, location, radius, depth, assigned_material,
                 rotation=(0.0, 0.0, 0.0), vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    if assigned_material:
        obj.data.materials.append(assigned_material)
    bevel = obj.modifiers.new(name="Machined edge", type="BEVEL")
    bevel.width = min(radius * 0.15, 0.018)
    bevel.segments = 3
    return obj


def add_area_light(name, location, energy, color, size, target):
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.color = color
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    look_at(obj, target)
    return obj


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def scene_coordinate(value, minimum, maximum, scene_minimum, scene_maximum):
    normalized = (value - minimum) / (maximum - minimum)
    return scene_minimum + normalized * (scene_maximum - scene_minimum)


def create_water_mesh(document, water_material, adaptive=False, name="Metal SPH water"):
    width = document["specification"]["width"]
    height = document["specification"]["height"]
    vertices = []
    for y in range(height):
        scene_x = -4.0 + 8.0 * y / (height - 1)
        for x in range(width):
            scene_y = -2.0 + 4.0 * x / (width - 1)
            vertices.append((scene_x, scene_y, -0.18))
    faces = []
    for y in range(height - 1):
        for x in range(width - 1):
            lower = y * width + x
            faces.append((lower, lower + 1, lower + width + 1, lower + width))

    mesh = bpy.data.meshes.new(f"{name} surface")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(water_material)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    subdivision = obj.modifiers.new(name="Field reconstruction", type="SUBSURF")
    subdivision.subdivision_type = "CATMULL_CLARK"
    subdivision.levels = 2 if adaptive else 1
    subdivision.render_levels = 2 if adaptive else 1
    solidify = obj.modifiers.new(name="Water depth", type="SOLIDIFY")
    solidify.thickness = 0.10 if adaptive else 0.16
    solidify.offset = -1.0
    return obj


def update_water(obj, frame, field_width, field_height, maximum_field_value,
                 adaptive=False, boundary_only=False):
    coordinates = []
    normalized_values = []
    for y in range(field_height):
        scene_x = -4.0 + 8.0 * y / (field_height - 1)
        for x in range(field_width):
            scene_y = -2.0 + 4.0 * x / (field_width - 1)
            value = frame["values"][y * field_width + x]
            density = min(value / max(maximum_field_value * 0.52, 1), 1.0)
            normalized_values.append(density)
            if adaptive:
                # The occupancy boundary stays derived from the accepted field,
                # while zero-valued neighbor vertices meet it at a waterline
                # rather than stretching down into a hidden full-channel sheet.
                z = -0.012 + 0.19 * (density ** 0.68) if value else -0.012
                if boundary_only:
                    z += 0.018
            elif value == 0:
                z = -0.18
            else:
                z = -0.015 + 0.31 * (density ** 0.55)
            coordinates.extend((scene_x, scene_y, z))

    if not adaptive:
        obj.data.vertices.foreach_set("co", coordinates)
        obj.data.update()
        return

    vertices = [tuple(coordinates[index:index + 3]) for index in range(0, len(coordinates), 3)]
    active_faces = []
    active_grid = []
    for y in range(field_height - 1):
        active_row = []
        for x in range(field_width - 1):
            lower = y * field_width + x
            corners = (lower, lower + 1, lower + field_width + 1, lower + field_width)
            active_row.append(max(normalized_values[index] for index in corners) > 0.0)
        active_grid.append(active_row)

    for y, row in enumerate(active_grid):
        for x, is_active in enumerate(row):
            if not is_active:
                continue
            if boundary_only:
                neighbors = (
                    y == 0 or not active_grid[y - 1][x],
                    y == len(active_grid) - 1 or not active_grid[y + 1][x],
                    x == 0 or not active_grid[y][x - 1],
                    x == len(row) - 1 or not active_grid[y][x + 1],
                )
                if not any(neighbors):
                    continue
            lower = y * field_width + x
            active_faces.append((lower, lower + 1, lower + field_width + 1, lower + field_width))

    obj.data.clear_geometry()
    obj.data.from_pydata(vertices, [], active_faces)
    obj.data.update()
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def build_scene(document, args):
    clear_scene()
    scene = bpy.context.scene
    hero = args.profile == "hero-v2"
    profile = get_profile("hero-v2") if hero else None
    configure_engine(scene, args)
    scene.render.resolution_x = args.width
    scene.render.resolution_y = args.height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.film_transparent = False
    scene.render.fps = 24
    scene.frame_start = 0
    scene.frame_end = 191
    scene.render.image_settings.color_depth = "8"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    scene.view_settings.exposure = -0.48 if hero else -0.15

    world = scene.world or bpy.data.worlds.new("Performance paper world")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (
        (0.012, 0.014, 0.020, 1.0) if hero else (0.78, 0.79, 0.80, 1.0)
    )
    background.inputs["Strength"].default_value = 0.16 if hero else 0.28

    paper = material(
        "Paper", (0.020, 0.023, 0.030) if hero else (0.953, 0.953, 0.941),
        roughness=0.82 if hero else 0.92,
    )
    court = material(
        "Court line", (0.11, 0.14, 0.20) if hero else (0.56, 0.56, 0.53),
        metallic=0.12 if hero else 0.0, roughness=0.72 if hero else 0.8,
    )
    porcelain = material(
        "Porcelain channel", (0.70, 0.73, 0.75) if hero else (0.91, 0.92, 0.91),
        roughness=0.31 if hero else 0.24,
    )
    onyx = material(
        "Onyx gate", (0.008, 0.011, 0.017), metallic=0.92 if hero else 0.78,
        roughness=0.24 if hero else 0.18,
    )
    receipt_material = material("Receipt porcelain", (0.985, 0.985, 0.974), roughness=0.32)
    ink = material("Receipt ink", (0.025, 0.025, 0.025), roughness=0.55)
    signal = material(
        "Proof signal", (0.0, 0.16, 0.65), metallic=0.08, roughness=0.24,
        emission=((0.0, 0.22, 0.82), 0.55),
    )
    water = material(
        "Cobalt SPH water", (0.001, 0.020, 0.17) if hero else (0.003, 0.12, 0.52),
        metallic=0.0 if hero else 0.04,
        roughness=0.14 if hero else 0.13,
        transmission=0.06 if hero else 0.30,
    )
    add_water_microstructure(water)
    if hero:
        water_bsdf = water.node_tree.nodes.get("Principled BSDF")
        set_input(water_bsdf, ["Coat Weight", "Clearcoat"], 0.04)
        set_input(water_bsdf, ["Specular IOR Level", "Specular"], 0.22)
        add_water_absorption(water)
        add_brushed_microstructure(onyx, scale=78.0, strength=0.075)
    water_edge = material(
        "Field-derived meniscus", (0.11, 0.36, 0.92), roughness=0.21,
        transmission=0.22,
        emission=((0.02, 0.16, 0.68), 0.12),
    ) if hero else None
    steel = material("Actuator steel", (0.17, 0.20, 0.24), metallic=0.96, roughness=0.16)
    rubber = material("Gate gasket", (0.003, 0.004, 0.006), roughness=0.48)

    add_cube("Measurement field", (0, 0, -0.32), (13.0, 9.0, 0.12), paper, 0.0)
    for coordinate in range(-6, 7):
        add_cube(f"Grid X {coordinate}", (coordinate, 0, -0.252), (0.012, 9.0, 0.006), court, 0.0)
    for coordinate in range(-4, 5):
        add_cube(f"Grid Y {coordinate}", (0, coordinate, -0.252), (13.0, 0.012, 0.006), court, 0.0)

    add_cube("Continuous channel floor", (0, 0, -0.105), (8.5, 4.4, 0.20), porcelain, 0.05)
    # Keep the camera-side boundary continuous but below the water silhouette.
    add_cube("Channel left wall", (0, -2.15, 0.04), (8.5, 0.16, 0.38), porcelain, 0.035)
    add_cube("Channel right wall", (0, 2.15, 0.28), (8.5, 0.16, 0.85), porcelain, 0.035)
    add_cube("Upstream end wall", (4.20, 0, 0.28), (0.16, 4.4, 0.85), porcelain, 0.035)
    add_cube("Downstream end wall", (-4.20, 0, 0.28), (0.16, 4.4, 0.85), porcelain, 0.035)

    bounds = document["bounds"]
    gate_scene_x = scene_coordinate(
        document["gateY"], bounds["minimumY"], bounds["maximumY"], -4.0, 4.0
    )
    opening_center_y = scene_coordinate(
        document["gateOpeningCenterX"], bounds["minimumX"], bounds["maximumX"], -2.0, 2.0
    )
    opening_half_width = (
        document["gateOpeningHalfWidth"]
        / (bounds["maximumX"] - bounds["minimumX"])
        * 4.0
    )
    opening_min = opening_center_y - opening_half_width
    opening_max = opening_center_y + opening_half_width
    left_wing_width = opening_min - (-2.0)
    right_wing_width = 2.0 - opening_max
    add_cube(
        "Gate left wing", (gate_scene_x, -2.0 + left_wing_width / 2, 0.30),
        (0.30, left_wing_width, 0.82), porcelain, 0.035,
    )
    add_cube(
        "Gate right wing", (gate_scene_x, opening_max + right_wing_width / 2, 0.30),
        (0.30, right_wing_width, 0.82), porcelain, 0.035,
    )
    gate = add_cube(
        "Retracting onyx gate", (gate_scene_x, opening_center_y, 0.30),
        (0.22, opening_half_width * 2, 0.88), onyx, 0.028,
    )
    add_cube(
        "Gate near rail", (gate_scene_x, opening_min - 0.08, 0.82),
        (0.34, 0.12, 1.78), onyx, 0.025,
    )
    add_cube(
        "Gate far rail", (gate_scene_x, opening_max + 0.08, 0.82),
        (0.34, 0.12, 1.78), onyx, 0.025,
    )
    add_cube(
        "Gate housing", (gate_scene_x, opening_center_y, 1.67),
        (0.48, opening_half_width * 2 + 0.42, 0.34), onyx, 0.045,
    )
    add_cube(
        "Gate datum", (gate_scene_x, opening_center_y, 1.86),
        (0.50, opening_half_width * 1.35, 0.035), signal, 0.012,
    )
    if hero:
        add_cube(
            "Gate near compression seal",
            (gate_scene_x - 0.122, opening_min - 0.012, 0.30),
            (0.035, 0.045, 0.91), rubber, 0.008,
        )
        add_cube(
            "Gate far compression seal",
            (gate_scene_x - 0.122, opening_max + 0.012, 0.30),
            (0.035, 0.045, 0.91), rubber, 0.008,
        )
        add_cube(
            "Gate bottom compression seal",
            (gate_scene_x - 0.122, opening_center_y, -0.075),
            (0.035, opening_half_width * 2 + 0.055, 0.055), rubber, 0.008,
        )
        add_cylinder(
            "Gate actuator shaft", (gate_scene_x, opening_center_y, 2.12),
            0.075, 0.72, steel,
        )
        add_cylinder(
            "Gate actuator collar", (gate_scene_x, opening_center_y, 1.82),
            0.14, 0.12, onyx,
        )
        for bolt_y in (opening_min - 0.08, opening_max + 0.08):
            for bolt_z in (0.34, 1.15):
                add_cylinder(
                    f"Rail fastener {bolt_y:.2f} {bolt_z:.2f}",
                    (gate_scene_x - 0.185, bolt_y, bolt_z),
                    0.038, 0.026, steel,
                    rotation=(0.0, math.radians(90.0), 0.0), vertices=24,
                )

    # The receipt is a persistent physical tag fixed to the channel, not a
    # caption or a late composite. Its cobalt proof bar activates after flow.
    receipt = add_cube(
        "Persistent receipt", (-2.30, 2.03, 0.69),
        (1.18, 0.075, 0.82), receipt_material, 0.018,
    )
    receipt.rotation_euler[1] = math.radians(-2.0)
    for row in range(4):
        line = add_cube(
            f"Receipt row {row}", (-2.30, 1.986, 0.90 - row * 0.14),
            (0.72 - row * 0.07, 0.014, 0.026), ink, 0.004,
        )
        line.rotation_euler[1] = math.radians(-2.0)
    add_cube("Receipt cobalt tag", (-2.71, 1.98, 0.69), (0.18, 0.028, 0.64), signal, 0.012)
    proof = add_cube("Receipt proof trace", (-1.78, 1.978, 0.69), (0.055, 0.032, 0.65), signal, 0.006)

    water_obj = create_water_mesh(document, water, adaptive=hero)
    # The adaptive SPH occupancy boundary is the v2 meniscus treatment. A
    # second translucent overlay was tested but rejected because the overlap
    # read as a composited halo instead of captured liquid.
    water_edge_obj = None

    focus = bpy.data.objects.new("Camera focus", None)
    bpy.context.collection.objects.link(focus)
    focus.location = (gate_scene_x - 0.55, 0.05, 0.25)
    camera_data = bpy.data.cameras.new("Sony FE 100mm Macro equivalent")
    camera_data.lens = profile["camera"]["lensMillimeters"] if hero else 100.0
    camera_data.sensor_width = 36.0
    camera_data.dof.use_dof = True
    camera_data.dof.focus_object = focus
    camera_data.dof.aperture_fstop = 4.8 if hero else 5.6
    camera = bpy.data.objects.new("One-shot macro camera", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera

    add_area_light(
        "Key softbox", (-1.8, -3.8, 6.2), 2050 if hero else 1650,
        (1.0, 0.92, 0.82), 4.2 if hero else 5.0, (gate_scene_x, 0, 0),
    )
    add_area_light(
        "Cobalt rim", (2.8, 3.2, 3.8), 1650 if hero else 1100,
        (0.12, 0.28, 1.0), 2.2 if hero else 3.0, (gate_scene_x, 0, 0.4),
    )
    add_area_light(
        "Receipt fill", (-4.0, 2.0, 3.2), 720 if hero else 980,
        (0.68, 0.82, 1.0), 1.8 if hero else 2.0, (-3.0, 0.25, 0),
    )
    if hero:
        add_area_light(
            "Gate edge strip", (-0.2, -1.5, 2.4), 920,
            (0.92, 0.96, 1.0), 1.1, (gate_scene_x, 0, 0.75),
        )

    return {
        "scene": scene,
        "water": water_obj,
        "water_edge": water_edge_obj,
        "gate": gate,
        "proof": proof,
        "camera": camera,
        "camera_focus": focus,
        "gate_scene_x": gate_scene_x,
        "hero": hero,
    }


def update_scene(objects, frame, frame_index, maximum_field_value, field_width, field_height):
    scene = objects["scene"]
    scene.frame_set(frame_index)
    update_water(
        objects["water"], frame, field_width, field_height, maximum_field_value,
        adaptive=objects["hero"],
    )
    if objects["water_edge"]:
        update_water(
            objects["water_edge"], frame, field_width, field_height,
            maximum_field_value, adaptive=True, boundary_only=True,
        )

    gate_progress = frame["gateOpenProgress"]
    objects["gate"].location.z = 0.30 + gate_progress * 1.08
    proof_progress = frame["proofProgress"]
    objects["proof"].hide_render = proof_progress <= 0.001
    objects["proof"].scale.z = max(proof_progress, 0.001)

    camera_progress = frame_index / 191.0
    camera = objects["camera"]
    if objects["hero"]:
        # Low macro dolly: the camera begins with the gate monumental and
        # follows the released signal downstream without introducing a cut.
        release_progress = min(max((frame_index - 48) / 108.0, 0.0), 1.0)
        release_progress = release_progress * release_progress * (3.0 - 2.0 * release_progress)
        camera.location = (
            -7.45 - 0.62 * release_progress,
            -10.65 + 0.52 * release_progress,
            0.98 - 0.12 * release_progress,
        )
        objects["camera_focus"].location = (
            objects["gate_scene_x"] - 0.42 - 1.22 * release_progress,
            0.03,
            0.22,
        )
    else:
        camera.location = (
            -8.35 + 0.50 * camera_progress,
            -10.70 + 0.82 * camera_progress,
            1.72 - 0.22 * camera_progress,
        )
        objects["camera_focus"].location.x = objects["gate_scene_x"] - 0.55 - 0.90 * camera_progress
    look_at(camera, objects["camera_focus"].location)


def main():
    args = parse_arguments()
    profile = get_profile("hero-v2") if args.profile == "hero-v2" else None
    field_path = pathlib.Path(args.field).resolve()
    output_dir = pathlib.Path(args.output_dir).resolve()
    receipt_path = pathlib.Path(args.receipt).resolve()
    actual_field_sha256 = sha256(field_path)
    if actual_field_sha256 != args.expected_field_sha256:
        raise SystemExit(
            f"field hash mismatch: expected {args.expected_field_sha256}, got {actual_field_sha256}"
        )
    if profile and actual_field_sha256 != profile["fieldSHA256"]:
        raise SystemExit(
            f"profile field hash mismatch: expected {profile['fieldSHA256']}, "
            f"got {actual_field_sha256}"
        )
    document = json.loads(field_path.read_text())
    frames_by_index = {frame["frameIndex"]: frame for frame in document["frames"]}
    requested_frames = (
        list(range(len(document["frames"])))
        if args.frames == "all"
        else [int(value) for value in args.frames.split(",")]
    )
    maximum_field_value = max(
        value for frame in document["frames"] for value in frame["values"]
    )
    objects = build_scene(document, args)
    output_dir.mkdir(parents=True, exist_ok=True)
    rendered_paths = []

    render_started = time.monotonic()
    for frame_index in requested_frames:
        frame = frames_by_index[frame_index]
        update_scene(
            objects, frame, frame_index, maximum_field_value,
            document["specification"]["width"],
            document["specification"]["height"],
        )
        output_path = output_dir / f"frame-{frame_index:04d}.png"
        objects["scene"].render.filepath = str(output_path)
        bpy.ops.render.render(write_still=True)
        rendered_paths.append(str(output_path))
        print(f"Rendered Blender field frame {frame_index}")
    render_elapsed_seconds = time.monotonic() - render_started

    if args.save_blend:
        save_path = pathlib.Path(args.save_blend).resolve()
        save_path.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(save_path))

    receipt = {
        "schemaVersion": 1,
        "blenderVersion": bpy.app.version_string,
        "engine": objects["scene"].render.engine,
        "profile": args.profile,
        "samples": args.samples,
        "renderElapsedSeconds": round(render_elapsed_seconds, 3),
        "fieldPath": str(field_path),
        "fieldSHA256": actual_field_sha256,
        "resolution": [args.width, args.height],
        "framesPerSecond": 24,
        "requestedFrames": requested_frames,
        "renderedPaths": rendered_paths,
        "camera": {
            "lensMillimeters": 100.0,
            "cutCount": 0,
            "continuousMove": True,
        },
        "geometry": {
            "channelContinuous": True,
            "gateOpeningCenterX": document["gateOpeningCenterX"],
            "gateOpeningHalfWidth": document["gateOpeningHalfWidth"],
            "waterSource": (
                profile["water"]["source"] if profile else "Metal SPH field values"
            ),
            "waterReconstruction": (
                profile["water"]["reconstruction"] if profile else "fixed field surface"
            ),
        },
    }
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n")
    print(f"Wrote Blender render receipt to {receipt_path}")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.stdout.flush()
        sys.stderr.flush()
        os._exit(1)
