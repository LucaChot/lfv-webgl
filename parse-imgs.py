import os
import json

# Specify the folder path containing the images
folder_path = './imgs'

rows = int(input("Number of rows: "))
columns = int(input("Number of columns: "))

# Function to extract u and v from the image filename
def extract_xy(filename):
    _, x, y, _, _ = filename.split('_')
    return int(x), int(y)

def inbounds(filename):
    x, y = extract_xy(filename)
    return x < rows and y < columns

def extract_u_v(filename):
    _, _, _, u, v  = filename[:-4].split('_')
    return u, v

# List to store image information
image_info_list = []

filtered_files = [file for file in os.listdir(folder_path) if file.endswith(".png") and 
                  "out_" in file and inbounds(file)]

sorted_files = sorted(filtered_files, key=extract_xy)

first_u, first_v = extract_u_v(sorted_files[0])
last_u, last_v = extract_u_v(sorted_files[-1])

            
centre_u = (float(first_u) + float(last_u)) / 2
centre_v = (float(first_v) + float(last_v)) / 2

for filename in sorted_files:
    # Extract file name, u, and v
    file_name = filename
    u, v = extract_u_v(filename)

    u_c = float(u) - centre_u
    v_c = float(v) - centre_v

    # Add information to the list
    image_info_list.append({
        "src": folder_path + "/"+ file_name,
        "u": str(u_c),
        "v": str(v_c)
    })

# Create a JSON file with the image information
js_file_path = './imgs.js'
with open(js_file_path, 'w') as js_file:
    js_file.write("var imgsData = ")
    js_file.write(json.dumps(image_info_list, indent=2))
    js_file.write(";\n");

print(f'JSON file created: {js_file_path}')
