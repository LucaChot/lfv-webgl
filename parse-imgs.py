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

lowest_u = 0
highest_u = 0
lowest_v = 0
highest_v = 0
first = True

# Iterate through each file in the folder
for filename in os.listdir(folder_path):
    if filename.endswith(".png") and "out_" in filename:
        # Extract file name, u, and v
        file_name = filename
        u, v = extract_u_v(filename)

        # Add information to the list
        '''
        image_info_list.append({
            "src": folder_path + "/"+ file_name,
            "u": u,
            "v": v
        })
        '''

        u = float(u)
        v = float(v)

        if first:
            lowest_u = u
            highest_u = u
            lowest_v = v
            highest_v = v
            first = False
        else:
            if lowest_u > u:
                lowest_u = u
            if highest_u < u:
                highest_u = u
            if lowest_v > v:
                lowest_v = v
            if highest_v < v:
                highest_v = v
            
centre_u = (lowest_u + highest_u) / 2
centre_v = (lowest_v + highest_v) / 2

for filename in os.listdir(folder_path):
    if filename.endswith(".png") and "out_" in filename:
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

    '''
    js_file.write("var lowestU = " + str(lowest_u) + ";\n")
    js_file.write("var highestU = " + str(highest_u) + ";\n")
    js_file.write("var lowestV = " + str(lowest_v) + ";\n")
    js_file.write("var highestV = " + str(highest_v) + ";\n")
    '''

print(f'JSON file created: {js_file_path}')
