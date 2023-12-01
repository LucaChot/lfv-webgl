// app.js
let gl;
// Global variable that lets program access variable buffer locations
let shaderProgram;
let canvas;
// --------------------Images----------------------------------

// Location of image files
let folderPath = "./imgs"
// Dimensions of images
let imgWidth = 1024;
let imgHeight = 1024;

// --------------------Inputs----------------------------------

let mouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

let keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  Space: false,
  Enter: false,
};

// --------------------Camera----------------------------------

// false: XYZ controsl, true: Orbital controls
let cameraMode = false;
let cameraFOV = 90;

// Max aperture includes a quarter of all the data cameras
let maxAperture = Math.max(-minX, maxX, -minY, maxY)
let aperture = 0;

let cameraPosition = glMatrix.vec3.fromValues(0, 0, 6);
// Centre around which orbital controls will rotate
let targetPosition = glMatrix.vec3.fromValues(0, 0, 0);
let upVector = glMatrix.vec3.fromValues(0, 1, 0);

let angleX = 0;
let angleY = 0;
let distance = 6;

// This -800 is an arbitrary point that gave the best results when used as 
// a principle point for the data cameras due to images being rectified and
// cropped
// Changing this can give interesting effects
let arrPrincipalPoint = -800;

// --------------------Matrices-------------------------------- 

const modelViewMatrix = glMatrix.mat4.create();
const projectionMatrix = glMatrix.mat4.create();
const intrinsicCamMatrix = glMatrix.mat4.create();

// Normal of planes
const N = glMatrix.vec4.fromValues(0,0,1,1);
// Point on focal plane
let wF = glMatrix.vec4.fromValues(0,0,-5,1);
// Point on camera / aperture plane
const wA = glMatrix.vec4.fromValues(0,0,0,1);


// Array data camera xy coordinates
let arrXYs = [];

// Array containing data camera homogeneous transformation matrices
let arrHTMatrices = [];
// Virtual camera coordinate to camera plane coordinate matrix
const A = glMatrix.mat4.create();

// --------------------Set-Up---------------------------------- 

// Check webgl2 is available
function initWebGL(canvas) {
    gl = canvas.getContext("webgl2");
    if (!gl) {
        console.error("Unable to initialize WebGL. Your browser may not support it.");
        return;
    }
}

// --------------------Shader----------------------------------

// Takes a source string and a shader type and compiles the source string 
// into a shader and returns it
function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation failed:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

// Initialises the shader and variable locations
function initShaders() {
  // Vertex shader source code
  const vsSource = `#version 300 es
    precision mediump float;

    layout(location = 0) in vec3 position;
    layout(location = 1) in vec2 uv;

    out vec2 vUv;

    void main(void) {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  // Fragment shader source code 
  const fsSource = `#version 300 es
    precision mediump float;

    uniform mediump sampler2DArray uSampler;

    uniform mat4 arr_HTM[${imgsData.length}];
    uniform vec2 arr_xy[${imgsData.length}];
    uniform mat4 A;
    uniform float aperture;

    in vec2 vUv;
    out vec4 fragColor;

    void main(void) {
      // Convert texture coordinates to camera pixel point
      vec4 p_k = vec4(vUv.x * 2.0 - 1.0, 1.0 - 2.0 * vUv.y,  0 , 1);


      // Get coordinate in data camera plane
      vec4 w_a = A * p_k;
      vec2 w = vec2(w_a.x / w_a.w, w_a.y / w_a.w);
      vec3 tex = vec3(0.0, 0.0, 0.0);
      float validPixelCount = 0.0;

      for (int i = 0; i < ${imgsData.length}; i++){
        // Get data camera pixel
        vec4 p_i = arr_HTM[i] * p_k;

        float w_x = w.x - arr_xy[i].x;
        float w_y = w.y - arr_xy[i].y;
        float d = ((w_x * w_x) + (w_y * w_y));

        // Check if light ray is outside aperture
        if (d > aperture * aperture) continue;

        vec2 tuv = vec2(p_i.x / p_i.w, p_i.y / p_i.w);

        // Convert coordinate to texture coordinate
        vec2 uv = vec2((tuv.x + 1.0) / 2.0, (1.0 - tuv.y) / 2.0);
        // Check if pixel is inside the data camera image
        if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
          // Add pixel colour and contribution
          float contribution = (1.0 / (1.0 + d));
          // Using smoothing
          tex += vec3(texture(uSampler, vec3(uv, i)).rgb) * contribution;
          validPixelCount += contribution;
          // Without smoothing -> better refocusing effect
          //tex += vec3(texture(uSampler, vec3(uv, i)).rgb);
          //validPixelCount += 1.0;
        }
      }
      // Divide by total contribution
      fragColor = vec4(tex, 1.0) / validPixelCount; 
    }
  `;

  // Compile both source codes to get two shaders
  const vertexShader = compileShader(vsSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(fsSource, gl.FRAGMENT_SHADER);

  // Create a shader program and attach and link both shaders
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error("Shader program linking failed:", gl.getProgramInfoLog(shaderProgram));
  }

  // Specify that we are using this shader
  gl.useProgram(shaderProgram);

  // Get the location of all variables in each shader and add it to the global
  // variable
  shaderProgram.positionAttribute = gl.getAttribLocation(shaderProgram, "position");
  gl.enableVertexAttribArray(0);

  shaderProgram.uvAttribute = gl.getAttribLocation(shaderProgram, 'uv');
  gl.enableVertexAttribArray(1);

  shaderProgram.arrHTMUniform = gl.getUniformLocation(shaderProgram, "arr_HTM");
  shaderProgram.arrXyUniform = gl.getUniformLocation(shaderProgram, "arr_xy");

  shaderProgram.paUniform = gl.getUniformLocation(shaderProgram, "A");
  shaderProgram.apertureUniform = gl.getUniformLocation(shaderProgram, "aperture");

  // Use the default location for the sampler
  const samplerArrayLocation = gl.getUniformLocation(shaderProgram, 'uSampler');
  gl.uniform1i(samplerArrayLocation, 0);
}

// --------------------Buffers---------------------------------

// Initialises the buffers for 'in' variables
function initBuffers() {
  // Contains the vertices of the points in the quad
  const vertices = [
    -1.0, -1.0,  0.0,
     1.0, -1.0,  0.0,
     1.0,  1.0,  0.0,
    -1.0,  1.0,  0.0,
  ];

  // Creates the vertices buffer and binds it the vertices array
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  // Contains the texture coordinates of the points in the quad
  const uvs = [
    0.0, 1.0,
    1.0, 1.0,
    1.0,  0.0,
    0.0,  0.0,
  ];
  // Creates the uv buffer and binds it the uvs array
  const uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
}

// Function to load an image
function loadImage(url) {
  return new Promise((resolve, reject) => {
  var image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

// Creates a 2D_SAMPLER_ARRAY texture, loads all the images specified in 
// imgs.js and stores them in the texture
async function createTextureArray(){

  imgs = await Promise.all(imgsData.map(item => loadImage(item.src)))
  var texture = gl.createTexture();
  gl.bindTexture( gl.TEXTURE_2D_ARRAY, texture );
  gl.texParameteri( gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
  gl.texParameteri( gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
  gl.texParameteri( gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
  gl.texParameteri( gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR );

  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, imgWidth, imgHeight, imgsData.length);

  for (var i = 0; i < imgs.length; i++) {
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0,0,0, i, imgWidth, imgHeight,1, gl.RGBA, gl.UNSIGNED_BYTE, imgs[i]);
  }

  // Calls render once the texture is complete
  render();
}

// --------------------Camera-Matrix-Functions-----------------

// Creates a view matrix for the virtual camera depending on the camera mode
// and returns it
function createVirtualViewMatrix(){
  const V = glMatrix.mat4.create();
  if(!cameraMode){ // If XYZ then camera faces forward
    let forward = glMatrix.vec3.create();
    glMatrix.vec3.copy(forward, cameraPosition);
    forward[2] = forward[2] - 1;
    glMatrix.mat4.lookAt(V, cameraPosition, forward, upVector);
  } else{ // If Orbital then camera faces targetPosition
    glMatrix.mat4.lookAt(V, cameraPosition, targetPosition, upVector);
  }
  return V;
}

// Takes plane normal, plane point and a viewMatrix and returns the 
// corresponding projection matrix
function create4dProj(normal, point, viewMatrix){
  // 4d plane point in camera coordinates
  const point_c_4 = glMatrix.vec4.create();
  glMatrix.vec4.transformMat4(point_c_4, point, viewMatrix);

  // 3d plane point in camera coordinates
  const point_c = glMatrix.vec3.create();
  glMatrix.vec3.copy(point_c, point_c_4);

  // Rotation matrix applied to normal
  const rotMat = glMatrix.mat3.fromValues(
    viewMatrix[0], viewMatrix[1], viewMatrix[2],
    viewMatrix[4], viewMatrix[5], viewMatrix[6],
    viewMatrix[8], viewMatrix[9], viewMatrix[10],
  );
  const normal_c = glMatrix.vec3.create();
  glMatrix.vec3.transformMat3(normal_c, normal, rotMat);

  return glMatrix.mat4.fromValues(
    1.0, 0.0, normal_c[0], 0.0,
    0.0, 1.0, normal_c[1], 0.0,
    0.0, 0.0, normal_c[2], 1.0,
    0.0, 0.0, -glMatrix.vec3.dot(normal_c, point_c), 0.0
    );
}

// Takes image width, height, projection distance and returns the intrinsic
// camera matrix so that images fit in a 2 x 2 grid centred at (0,0)
function createInCamMatrix(width, height, projD){
  aspect = width / height
  return glMatrix.mat4.fromValues(
    -1 / (aspect * projD), 0, 0, 0,
    0, -1 / projD, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  );
}

// --------------------Virtual-Camera--------------------------

// Creates the virtual camera matrices
function createVCameraMatrices() {
  const V = createVirtualViewMatrix();
  glMatrix.mat4.copy(modelViewMatrix, V);
  
  const floatD = Math.tan(((cameraFOV / 2) / 180) * Math.PI);
  const K = createInCamMatrix(imgWidth, imgHeight, floatD);
  glMatrix.mat4.copy(intrinsicCamMatrix, K);

  const p1 = create4dProj(N, wF, modelViewMatrix);
  glMatrix.mat4.copy(projectionMatrix, p1);
}

// --------------------Array-Cameras---------------------------

// Populates with data camera's XY coordinates
function createArrayCameraXY(){
  arrXYs = [];
  imgsData.map(item => {
    arrXYs.push(parseFloat(item.x));
    arrXYs.push(parseFloat(item.y));
  });
}

// Calculates the data camera's homogeneous transformation matrices and adds
// them to the array
function createHTMatrix(){
  // Inverse camera pixel coordinates
  const ViPiKi = glMatrix.mat4.create();

  // Holds values of each stage of the matrix multiplication
  const PV = glMatrix.mat4.create();
  const KPV = glMatrix.mat4.create();
  
  glMatrix.mat4.multiply(PV, projectionMatrix, modelViewMatrix);
  glMatrix.mat4.multiply(KPV, intrinsicCamMatrix, PV);
  glMatrix.mat4.invert(ViPiKi, KPV);

  const HTMat4s = imgsData.map(item => {
    const arrCamPosition = glMatrix.vec3.fromValues(item.x, item.y, wA[2]);
    // If you replace arrPrincipalPoint with wA[2]-1 then we set it so that 
    // the data cameras face perpendicular to focal plane
    const arrCamTarget = glMatrix.vec3.fromValues(wF[0], wF[1], arrPrincipalPoint);
    const arrModelViewMatrix = glMatrix.mat4.create();

    glMatrix.mat4.lookAt(arrModelViewMatrix, arrCamPosition, arrCamTarget, upVector);
    const arrProjMat =  create4dProj(N, wF, arrModelViewMatrix);

    const KPVViPiKi = glMatrix.mat4.create();

    glMatrix.mat4.multiply(PV, arrProjMat, arrModelViewMatrix);
    glMatrix.mat4.multiply(KPV, intrinsicCamMatrix, PV);
    glMatrix.mat4.multiply(KPVViPiKi, KPV, ViPiKi);

    return KPVViPiKi ;
  });

  // Copies values into global array
  arrHTMatrices = []
  HTMat4s.forEach(m => {
    for (let i = 0; i < 16; i++) {
      arrHTMatrices.push(m[i]);
    }
  });
}

// Calculates the virtual camera pixel coordinates to data camera plane 
// coordinates matrix
function createAMatrix(){
  const P_A = create4dProj(N, wA, modelViewMatrix);
  const P_AV = glMatrix.mat4.create();
  glMatrix.mat4.multiply(P_AV, P_A, modelViewMatrix);
  
  const KP_AV = glMatrix.mat4.create();
  glMatrix.mat4.multiply(KP_AV, intrinsicCamMatrix, P_AV);

  glMatrix.mat4.invert(A, KP_AV);
}

// --------------------Update-Uniforms-------------------------

// Calls functions to update matrices and then updates uniforms  with the 
// updated values
function updateUniforms() {
  // Update matrices
  createVCameraMatrices();
  createHTMatrix();
  createAMatrix();

  // Update uniforms
  gl.uniformMatrix4fv(shaderProgram.arrHTMUniform, false, arrHTMatrices);
  gl.uniform2fv(shaderProgram.arrXyUniform, arrXYs);

  gl.uniformMatrix4fv(shaderProgram.paUniform, false, A);
  gl.uniform1f(shaderProgram.apertureUniform, aperture);
}

// Calculates camera position based on orbital coordinates
function updateOrbitalCamera(){
  cameraPosition[0] = targetPosition[0] + distance * Math.sin(angleX);
  cameraPosition[1] = targetPosition[1] + distance * Math.sin(angleY);
  cameraPosition[2] = targetPosition[2] + distance * Math.cos(angleX);
}

// Clamps range of orbital coordinates
function clampOrbitalCamera(){
  angleX = Math.max(Math.min(angleX, Math.PI/4), -Math.PI/4);
  angleY = Math.max(Math.min(angleY, Math.PI/4), -Math.PI/4);
  distance = Math.max(distance, 2);
}

// Clamps range of camera position for XYZ controls
function clampCameraPosition() {
  cameraPosition[0] = Math.max(Math.min(cameraPosition[0], maxX), minX);
  cameraPosition[1] = Math.max(Math.min(cameraPosition[1], maxY), minY);
}

// --------------------Render----------------------------------

// Renders the seen by drawing the triangles making up the quad
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

// --------------------Main------------------------------------

function main() {
    initComponents();
    canvas = document.getElementById("glcanvas");
    initWebGL(canvas);
    initShaders();

    initBuffers();

    createTextureArray();

    createArrayCameraXY();
  
    updateUniforms();
  
    setupEventListeners();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    render();
    updateComponents();
}

main();

