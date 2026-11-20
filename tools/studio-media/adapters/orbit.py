"""Studio's original three-second opening shot. Run only from the Blender adapter."""

import math
import sys

import bpy
from mathutils import Vector


def color(name, rgb, metallic=0.0, roughness=0.46, emission=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    surface = material.node_tree.nodes.get('Principled BSDF')
    surface.inputs['Base Color'].default_value = (*rgb, 1.0)
    surface.inputs['Metallic'].default_value = metallic
    surface.inputs['Roughness'].default_value = roughness
    surface.inputs['Emission Color'].default_value = (*rgb, 1.0)
    surface.inputs['Emission Strength'].default_value = emission
    return material


def rounded_block(name, position, size, bevel, material, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position)
    block = bpy.context.object
    block.name = name
    block.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel_modifier = block.modifiers.new('Rounded edges', 'BEVEL')
    bevel_modifier.width = bevel
    bevel_modifier.segments = 5
    block.modifiers.new('Weighted corners', 'WEIGHTED_NORMAL')
    block.data.materials.append(material)
    block.parent = parent
    return block


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def softbox(name, position, watts, rgb, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = watts
    data.color = rgb
    data.shape = 'DISK'
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = position
    point_at(obj, (0, 0, 0.7))


def main(frame_prefix):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    # This small studio scene needs few light bounces and renders 72 frames on CPU.
    scene.cycles.samples = 6
    scene.cycles.max_bounces = 3
    scene.cycles.diffuse_bounces = 2
    scene.cycles.glossy_bounces = 1
    scene.cycles.use_denoising = True
    scene.cycles.denoising_prefilter = 'FAST'
    if hasattr(scene.cycles, 'denoising_quality'):
        scene.cycles.denoising_quality = 'FAST'
    scene.render.use_persistent_data = True
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 4
    world = bpy.data.worlds.new('Midnight')
    world.use_nodes = True
    world.node_tree.nodes.get('Background').inputs['Color'].default_value = (0.025, 0.042, 0.055, 1)
    world.node_tree.nodes.get('Background').inputs['Strength'].default_value = 0.24
    scene.world = world

    slate = color('Blue slate', (0.018, 0.036, 0.064), metallic=0.28)
    acrylic = color('Ice blue acrylic', (0.045, 0.27, 0.43), metallic=0.42)
    mint = color('Mint glass', (0.21, 0.91, 0.61), metallic=0.25, emission=0.25)
    silver = color('Pearl', (0.69, 0.84, 0.88), metallic=0.32)
    rounded_block('Stage', (0, 0, -0.29), (200, 200, 0.4), 0.08, slate)
    rounded_block('Plinth', (0, 0, 0), (3.7, 2.65, 0.23), 0.11, slate)

    pivot = bpy.data.objects.new('Tile pivot', None)
    bpy.context.collection.objects.link(pivot)
    rounded_block('Control tile', (0, 0, 0), (2.55, 1.7, 0.22), 0.16, acrylic, pivot)
    rounded_block('Inset panel', (0, 0, 0.12), (2.24, 1.38, 0.04), 0.02, slate, pivot)
    for index, height in enumerate((0.26, 0.48, 0.74, 0.54, 0.34)):
        x = (index - 2) * 0.28
        rounded_block('Audio meter', (x, 0, 0.175), (0.15, height, 0.07), 0.032, mint, pivot)
    rounded_block('Status light', (0.91, 0.51, 0.164), (0.085, 0.085, 0.048), 0.022, silver, pivot)

    for frame, height, turn in ((1, 0.82, -16), (36, 1.12, 12), (72, 0.9, 31)):
        pivot.location = (0, 0, height)
        pivot.rotation_euler = (math.radians(19), math.radians(-12), math.radians(turn))
        pivot.keyframe_insert(data_path='location', frame=frame)
        pivot.keyframe_insert(data_path='rotation_euler', frame=frame)

    softbox('Left key', (-3.2, -3.1, 5.5), 650, (0.72, 0.88, 1.0), 5)
    softbox('Teal rim', (2.2, 2.6, 3.2), 550, (0.4, 1.0, 0.75), 3)
    softbox('Front fill', (3.5, -1.6, 3.6), 135, (1.0, 0.83, 0.7), 4)
    camera_data = bpy.data.cameras.new('Orbit camera')
    camera = bpy.data.objects.new('Orbit camera', camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (3.62, -5.65, 4.7)
    point_at(camera, (0, 0, 0.56))
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = 6.0
    scene.camera = camera

    scene.render.resolution_x = 640
    scene.render.resolution_y = 360
    scene.render.resolution_percentage = 100
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 72
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = frame_prefix
    bpy.ops.render.render(animation=True)


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1])
