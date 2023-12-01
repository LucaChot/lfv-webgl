WEBGL Light Field Renderer

STRUCTURE:
The code is divided into 4 components:
- index.html -> contains the html elements to be displayed
- index.js -> contains the rendering functions and main
- input.js -> contains the user input functions
- components.js -> contains the html component creation and update functions

#index.js#
--------------------
Global variables
--------------------
WebGL Set up
--------------------
Shader
--------------------
Buffers
--------------------
Camera Matrix Funcs
--------------------
Virtual Camera
--------------------
Array Cameras
--------------------
Update Uniforms
--------------------
Render
--------------------
Main
--------------------

#input.js#
--------------------
Check-Box
--------------------
Mouse Inputs
--------------------
Mouse Wheel
--------------------
Arrow Keys
--------------------
Set Value Buttons
--------------------
Aperture Slider
--------------------
Setup Event Handlers
--------------------

#components.js#

--------------------
Create XYZ Display
--------------------
Create Orbital Display
--------------------
Init + Update
--------------------

USER INPUT:
The program is automatically in XYZ mode. By checking the Orbital checkbox, the
camera then switches to Orbital mode

#XYZ mode#
In XYZ mode, the camera moves along the X,Y,Z axis using the given keys:
- Left Arrow -> negative X
- Right Arrow -> positive X
- Space -> positive Y
- Enter -> negative Y
- Up Arrow -> negative Z
- Down Arrow -> positive Z
In addition the user can also set the camera's XYZ coordinates

#Orbital mode#
In Orbital mode, the camera moves using mouse drag and Up and Down arrow keys:
- Dragging the mouse horizontally to the left rotates the camera in the XZ plane 
  to the right and vice versa
- Dragging the mouse vertical to the down rotates the camera in the YZ plane 
  up and vice versa
- Up arrow -> decreases orbital distance
- Down arrow -> increases orbital distance
In addition, the user can also set the camera's orbital coordinates as well as
the Z coordinate of the orbital centre

#Focal Plane#
To move the focal plane the user can use the mouse scroll:
- Scroll Up -> increases Z coordinate of plane point
- Scroll Down -> decreases Z coordinate of plane point
The user can also set the focal plane point's Z coordinate

#Aperture#
The user can use the slider to set the aperture of the camera

#Set Up#
To set up this program, ensure that there is a file directory called imgs with
images of the format out_U_V_u_v.png. Call the parse-imgs.py script and specify
the number of imgs from the centre you would like (E.g. width and height set to
2 will give a 3 x 3 data img array). This script will then create a file called 
imgs.js which will contain the image data required for the script. In addition, 
set the image width and height global variables in index.js. Then run the 
server (I did this using a console command library called 'servez').
