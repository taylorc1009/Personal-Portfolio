"""
	this script is used to replace hex values across every SVG so that they all use the same colour scheme
"""

import os, re

replacements = {
    "#264478": "#C31432",
    "#A5A5A5": "#D5D5D5",
    "#255E91": "#6bE585",
    "#4472C4": "#8360C3",
    "#43682B": "#78FFDB",
    "#9E480E": "#FF4B2B",
    "#997300": "#FFFDE4"
}

for filename in [file for file in os.listdir(os.getcwd()) if file.endswith(".svg")]:
    with open(os.path.join(os.getcwd(), filename), "r") as svg:
        lines = svg.readlines()

    updated_lines = []
    for line in lines:
        try:
            hex_values = re.findall(r'#[0-9A-Fa-f]{6}+', line)

            for hex_value in hex_values:
                if hex_value in replacements:
                    line = line.replace(hex_value, replacements[hex_value])
        except:
            pass

        updated_lines.append(
            re.sub(r'(?<!\n)<path', r'\n<path', line)
        )

    with open(os.path.join(os.getcwd(), filename), "w") as svg:
            svg.writelines(updated_lines)
