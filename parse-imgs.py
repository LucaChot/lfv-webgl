import os
import json

# Specify the folder path containing the images
folder_path = './imgs'

# Function to extract u and v from the image filename
def extract_u_v(filename):
    _, _, _, u, v, _ = filename[:-4].split('_')
    return u, v

# List to store image information
image_info_list = []

# Iterate through each file in the folder
for filename in os.listdir(folder_path):
    if filename.endswith(".png") and "out_" in filename:
        # Extract file name, u, and v
        file_name = filename
        u, v = extract_u_v(filename)

        # Add information to the list
        image_info_list.append({
            "src": folder_path + "/"+ file_name,
            "u": u,
            "v": v
        })

# Create a JSON file with the image information
js_file_path = './imgs.js'
with open(js_file_path, 'w') as js_file:
    js_file.write("var imgsData = ")
    js_file.write(json.dumps(image_info_list, indent=2))

print(f'JSON file created: {js_file_path}')
