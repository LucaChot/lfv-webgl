import os
import json

# Specify the folder path containing the images
folder_path = './imgs'

width= int(input("Width: "))
height = int(input("Height: "))

# Function to extract u and v from the image filename
def extract_xy(filename):
    _, x, y, _, _ = filename.split('_')[:5]
    return int(x), -int(y)

def inbounds(filename):
    x, y = extract_xy(filename)
    return x < 8 + height and x > 8 - height and y > -8 - width and y < -8 + width

def extract_u_v_corrected(filename):
    _, _, _, u, v  = filename[:-4].split('_')[:5]
    x = float(v)
    y = -float(u)
    return x, y

# List to store image information
image_info_list = []

filtered_files = [file for file in os.listdir(folder_path) if file.endswith(".png") and 
                  "out_" in file and inbounds(file)]


sorted_files = sorted(filtered_files, key=extract_xy)

first_x, first_y = extract_u_v_corrected(sorted_files[0])
last_x, last_y = extract_u_v_corrected(sorted_files[-1])

            
centre_x = (first_x + last_x) / 2
centre_y = (first_y + last_y) / 2

minX = first_x - centre_x
maxX = last_x - centre_x
minY = first_y - centre_y
maxY = last_y - centre_y

for filename in sorted_files:
    # Extract file name, u, and v
    file_name = filename
    x, y = extract_u_v_corrected(filename)

    u_c = x - centre_x
    v_c = y - centre_y

    # Add information to the list
    image_info_list.append({
        "src": folder_path + "/"+ file_name,
        "x": str(u_c),
        "y": str(v_c)
    })

# Create a JSON file with the image information
js_file_path = './imgs.js'
with open(js_file_path, 'w') as js_file:
    js_file.write("var imgsData = ")
    js_file.write(json.dumps(image_info_list, indent=2))
    js_file.write(";\n");

    js_file.write("var arrWidth = " + str(2*width - 1) + ";\n")
    js_file.write("var arrHeight = " + str(2*height - 1) + ";\n")


    js_file.write("var minX = " + str(minX) + ";\n")
    js_file.write("var maxX = " + str(maxX) + ";\n")
    js_file.write("var minY = " + str(minY) + ";\n")
    js_file.write("var maxY = " + str(maxY) + ";\n")

print(f'JSON file created: {js_file_path}')
