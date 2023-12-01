import os
import json

# For some reason the images the file name UV and uv  coordinates are not in the
# standard X goes to the right and Y goes up. Instead U goes up and V goes to 
# the left. However, u increases in the down direction and v increases in the
# right direction. Therefore I need to do some conversions to get the images 
# in the standard x and y coordinate system


# Specify the folder path containing the images
folder_path = './imgs'

# Specify the number of imgs from the centre
width= int(input("Width: "))
height = int(input("Height: "))

# Extracts X and Y from the image filename
# The X will be negative but this ensures it works with light fields with a 
# different number of imgs in the imgs folder
def extract_YX(filename):
    _, U, V, _, _ = filename.split('_')[:5]
    return int(U), -int(V)

# Checks if the img file is in the bounds entered
def inbounds(filename):
    U, V = extract_YX(filename)
    return U < 8 + height and U > 8 - height and V > -8 - width and V < -8 + width

#Extracts x and y from image filename
def extract_u_v_corrected(filename):
    _, _, _, u, v  = filename[:-4].split('_')[:5]
    x = float(v)
    y = -float(u)
    return x, y

# Filtered imgs which are in the bounds
filtered_files = [file for file in os.listdir(folder_path) if file.endswith(".png") and 
                  "out_" in file and inbounds(file)]

# Sorts the imgs so that it is row major from left to right ascending up the screen
sorted_files = sorted(filtered_files, key=extract_YX)

# Extracts the x and y of the bottom left and top right image
first_x, first_y = extract_u_v_corrected(sorted_files[0])
last_x, last_y = extract_u_v_corrected(sorted_files[-1])

# Calculate centre coordinate 
centre_x = (first_x + last_x) / 2
centre_y = (first_y + last_y) / 2

# Calculate min and max of x and y coordinates
minX = first_x - centre_x
maxX = last_x - centre_x
minY = first_y - centre_y
maxY = last_y - centre_y

# List to store image information
image_info_list = []

for filename in sorted_files:
    # Extract file name, u, and v
    file_name = filename
    x, y = extract_u_v_corrected(filename)

    x_c = x - centre_x
    y_c = y - centre_y

    # Add information to the list
    image_info_list.append({
        "src": folder_path + "/"+ file_name,
        "x": str(x_c),
        "y": str(y_c)
    })

# Create a js file with the image information
js_file_path = './imgs.js'
with open(js_file_path, 'w') as js_file:
    js_file.write("var imgsData = ")
    js_file.write(json.dumps(image_info_list, indent=2))
    js_file.write(";\n");

    js_file.write("var minX = " + str(minX) + ";\n")
    js_file.write("var maxX = " + str(maxX) + ";\n")
    js_file.write("var minY = " + str(minY) + ";\n")
    js_file.write("var maxY = " + str(maxY) + ";\n")

print(f'imgs.js created: {js_file_path}')
