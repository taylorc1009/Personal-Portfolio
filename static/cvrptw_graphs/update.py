"""
	this script is used to replace hex values across every SVG so that they all use the same colour scheme
"""

import os, re

replacements = {
    "#636363": "#F2727F",
    "#6bE585": "#6BE585",
}

for filename in [file for file in os.listdir(os.getcwd()) if file.endswith(".svg")]:
    with open(os.path.join(os.getcwd(), filename), "r") as svg:
        lines = svg.readlines()

    updated_lines = []
    for line in lines:
        hex_values = re.findall(r'#[0-9A-Fa-f]{6}', line)

        for hex_value in hex_values:
            if hex_value in replacements:
                line = line.replace(hex_value, replacements[hex_value].upper())

        updated_lines.append(
            line
            #re.sub(r'(?<!\n)<path', r'\n<path', line)
        )

    with open(os.path.join(os.getcwd(), filename), "w") as svg:
            svg.writelines(updated_lines)
