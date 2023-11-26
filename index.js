// app.js
let gl;
let shaderProgram;
let canvas;

// --------------------Images----------------------------------

let folderPath = "./imgs"

// --------------------Inputs----------------------------------

let mouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

let keys = {
  ArrowUp: false,
  ArrowDown: false,
};

// --------------------Camera----------------------------------

let cameraMode = false;
let cameraFOV = 90;

let cameraPosition = glMatrix.vec3.fromValues(0, 0, 6);
let targetPosition = glMatrix.vec3.fromValues(0, 0, 0);
let upVector = glMatrix.vec3.fromValues(0, 1, 0);

let angleX = 0;
let angleY = 0;
let distance = 6;

// --------------------Matrices-------------------------------- 

const modelViewMatrix = glMatrix.mat4.create();
const projectionMatrix = glMatrix.mat4.create();

const N = glMatrix.vec4.fromValues(0,0,1,1);
let wF = glMatrix.vec4.fromValues(0,0,0,1);
const wA = glMatrix.vec4.fromValues(0,0,5,1);

const intrinsicCamMatrix = glMatrix.mat4.create();
const invIntrinsicCamMatrix = glMatrix.mat4.create();
const inverseModelViewMatrix = glMatrix.mat4.create();
const inverseProjectionMatrix = glMatrix.mat4.create();

let arrUVs = [];

let arrHTMatrices = [];
const A = glMatrix.mat4.create();

let inverseProjectionAMatrix = glMatrix.mat4.create();

// --------------------Set-Up---------------------------------- 

function initWebGL(canvas) {
    gl = canvas.getContext("webgl2");
    if (!gl) {
        console.error("Unable to initialize WebGL. Your browser may not support it.");
        return;
    }
}

// --------------------Shader----------------------------------

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

function initShaders() {
    const vsSource = `#version 300 es
        precision mediump float;

        layout(location = 0) in vec3 position;
        layout(location = 1) in vec2 uv;

        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;

        out vec2 vUv;

        void main(void) {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `;

    const fsSource = `#version 300 es
        precision mediump float;

        uniform mediump sampler2DArray uSampler;

        uniform mat4 arr_HTM[${imgsData.length}];
        uniform vec2 arr_uv[${imgsData.length}];
        uniform mat4 A;

        in vec2 vUv;
        out vec4 fragColor;


        bool inGrid(vec2 w){
          return w.x < ${maxU} && w.x > ${minU} && w.y < ${maxV} && w.y > ${minV};
        }

        vec3 nearestArrCamera(vec4 p_k, vec2 w_a){
          vec3 tex = vec3(0.0, 0.0, 0.0);
          bool first = true;
          float min_d = 0.0;

          for (int i = 0; i < ${imgsData.length}; i++){
            vec4 p_i = arr_HTM[i] * p_k;

            float w_x = w_a.x - arr_uv[i].x;
            float w_y = w_a.y - arr_uv[i].y;
            float d = ((w_x * w_x) + (w_y * w_y));

            vec2 uv = vec2((p_i.x + 1.0) / 2.0, (1.0 - p_i.y) / 2.0);

            if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {

              if (first || d < min_d) {
                tex = vec3(texture(uSampler, vec3(uv, i)).rgb);
                min_d = d;
                first = false;
              }
            }
          }
          return tex;
        }

        vec2 getUV(vec4 p_k, int i) {
            vec4 p_i = arr_HTM[i] * p_k;
            return vec2((p_i.x + 1.0) / 2.0, (1.0 - p_i.y) / 2.0);
        }

        vec3 interpolate(float x, float x1, float x2, vec3 f1, vec3 f2){
          float a = (x2 - x) / (x2 - x1);
          float b = (x - x1) / (x2 - x1);
          return a * f1 + b * f2;
        }

        vec3 bInterpolate(vec4 p_k, vec2 w_a, int i){
          //Interpolate along x-axis first
          vec2 p_1 = getUV(p_k, i);
          vec2 p_2 = getUV(p_k, i-1);
          vec2 p_3 = getUV(p_k, i-${arrHeight});
          vec2 p_4 = getUV(p_k, i-1-${arrHeight});
          
          vec3 f1 = interpolate(w_a.x, arr_uv[i].x, arr_uv[i-${arrHeight}].x,
            vec3(texture(uSampler,vec3(p_1, (i))).rgb),
            vec3(texture(uSampler,vec3(p_3, (i-${arrHeight}))).rgb));

          vec3 f2 = interpolate(w_a.x, arr_uv[i-1].x, arr_uv[i-1-${arrHeight}].x,
            vec3(texture(uSampler,vec3(p_2, (i-1))).rgb),
            vec3(texture(uSampler,vec3(p_4, (i-1-${arrHeight}))).rgb));

          //Interpolate along y-axis
          return interpolate(w_a.y, arr_uv[i].y, arr_uv[i-1].y,
            f1,
            f2);
        }


        vec3 bilinearInterpolate(vec4 p_k, vec2 w_a) {
          vec3 tex = vec3(0.0, 0.0, 0.0);
          for (int i = ${arrHeight} + 1; i < ${imgsData.length}; i++){

            // Don't check camera's on the top border
            if (i % ${arrHeight} == 0) continue;
            // Only apply bilinear interpolation once bottom left corner is found
            if (w_a.x < arr_uv[i].x || w_a.y < arr_uv[i].y) continue;

            vec4 p_i = arr_HTM[i] * p_k;
            vec2 uv = vec2((p_i.x + 1.0) / 2.0, (1.0 - p_i.y) / 2.0);

            // If uv out of camera image continue
            if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) continue;

            tex = bInterpolate(p_k, w_a, i);
          }
          return tex;
        }

        void main(void) {
          vec4 p_k = vec4(vUv.x * 2.0 - 1.0, 1.0 - 2.0 * vUv.y,  0 , 1);
          vec4 w_a = A * p_k;
          vec2 w = w_a.xy;

          vec3 tex;

          if(!inGrid(w)){
            tex = nearestArrCamera(p_k, w);
          } else {
            tex = bilinearInterpolate(p_k, w);
          }
          fragColor = vec4(tex, 1.0); 
        }
    `;
  

    const vertexShader = compileShader(vsSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fsSource, gl.FRAGMENT_SHADER);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error("Shader program linking failed:", gl.getProgramInfoLog(shaderProgram));
    }

    gl.useProgram(shaderProgram);

    shaderProgram.positionAttribute = gl.getAttribLocation(shaderProgram, "position");
    gl.enableVertexAttribArray(0);

    shaderProgram.uvAttribute = gl.getAttribLocation(shaderProgram, 'uv');
    gl.enableVertexAttribArray(1);

    shaderProgram.modelViewMatrixUniform = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
    shaderProgram.projectionMatrixUniform = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");

    shaderProgram.arrHTMUniform = gl.getUniformLocation(shaderProgram, "arr_HTM");
    shaderProgram.arrUvUniform = gl.getUniformLocation(shaderProgram, "arr_uv");

    shaderProgram.paUniform = gl.getUniformLocation(shaderProgram, "A");

    const samplerArrayLocation = gl.getUniformLocation(shaderProgram, 'uSampler');
    gl.uniform1i(samplerArrayLocation, 0);
}

// --------------------Buffers---------------------------------

function initBuffers() {
    const vertices = [
        -1.0, -1.0,  0.0,
         1.0, -1.0,  0.0,
         1.0,  1.0,  0.0,
        -1.0,  1.0,  0.0,
    ];

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const uvs = [
        0.0, 1.0,
        1.0, 1.0,
        1.0,  0.0,
        0.0,  0.0,
    ];

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

async function createTextureArray(){

  imgs = await Promise.all(imgsData.map(item => loadImage(item.src)))
  var texture = gl.createTexture();
  gl.bindTexture( gl.TEXTURE_2D_ARRAY, texture );
  gl.texParameteri( gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
  gl.texParameteri( gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
  gl.texParameteri( gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
  gl.texParameteri( gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR );

  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, 1400, 800, imgsData.length);

  for (var i = 0; i < imgs.length; i++) {
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0,0,0, i, 1400, 800,1, gl.RGBA, gl.UNSIGNED_BYTE, imgs[i]);
  }

  render();
}

// --------------------Camera-Matrix-Functions-----------------

function createVirtualViewMatrix(){
  if(!cameraMode){
    glMatrix.mat4.lookAt(modelViewMatrix, cameraPosition, targetPosition, upVector);
  } else{
    let forward = glMatrix.vec3.create();
    glMatrix.vec3.copy(forward, cameraPosition);
    forward[2] = forward[2] - 1;
    glMatrix.mat4.lookAt(modelViewMatrix, cameraPosition, forward, upVector);
  }
}

function create4dProj(normal, point, viewMatrix){
  const point_c_4 = glMatrix.vec4.create();
  glMatrix.vec4.transformMat4(point_c_4, point, viewMatrix);
  const point_c = glMatrix.vec3.create();
  glMatrix.vec3.copy(point_c, point_c_4);

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

function createInCamMatrix(width, height, projD){
  aspect = width / height
  glMatrix.mat4.copy(intrinsicCamMatrix, glMatrix.mat4.fromValues(
    1 / (aspect * projD), 0, 0, 0,
    0, 1 / projD, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ));
}

// --------------------Virtual-Camera--------------------------

function initCamera() {
  createVirtualViewMatrix();
  glMatrix.mat4.invert(inverseModelViewMatrix, modelViewMatrix);
  
  //TODO: Remove this
  glMatrix.mat4.perspective(projectionMatrix, Math.PI / 4, gl.canvas.width / gl.canvas.height, 0.1, 10);

  const floatD = Math.tan(((cameraFOV / 2) / 180) * Math.PI);
  createInCamMatrix(1400, 800, floatD);
  glMatrix.mat4.invert(invIntrinsicCamMatrix, intrinsicCamMatrix);
  
  const p1 = create4dProj(N, wF, modelViewMatrix);
  glMatrix.mat4.invert(inverseProjectionMatrix, p1);

}

// --------------------Array-Cameras---------------------------

function createArrayCameraUV(){
  arrUVs = [];
  imgsData.map(item => {
    arrUVs.push(parseFloat(item.u));
    arrUVs.push(parseFloat(item.v));
  });
}

function createHTMatrix(){
  const PiKi = glMatrix.mat4.create();
  const ViPiKi = glMatrix.mat4.create();
  
  glMatrix.mat4.multiply(PiKi, inverseProjectionMatrix, invIntrinsicCamMatrix);
  glMatrix.mat4.multiply(ViPiKi, inverseModelViewMatrix, PiKi);

  const HTMat4s = imgsData.map(item => {
    const arrCamPosition = glMatrix.vec3.fromValues(item.u, item.v, wA[2]);
    const arrCamTarget = glMatrix.vec3.fromValues(item.u, item.v, wA[2]-1);
    const arrModelViewMatrix = glMatrix.mat4.create();

    glMatrix.mat4.lookAt(arrModelViewMatrix, arrCamPosition, arrCamTarget, upVector);
    const  arrProjMat =  create4dProj(N, wF, arrModelViewMatrix);

    const VViPiKi = glMatrix.mat4.create();
    const PVViPiKi = glMatrix.mat4.create();
    const KPVViPiKi = glMatrix.mat4.create();

    
    glMatrix.mat4.multiply(VViPiKi, arrModelViewMatrix, ViPiKi);
    glMatrix.mat4.multiply(PVViPiKi, arrProjMat, VViPiKi);
    glMatrix.mat4.multiply(KPVViPiKi, intrinsicCamMatrix, PVViPiKi);

    return KPVViPiKi ;
  });

  arrHTMatrices = []
  HTMat4s.forEach(m => {
    for (let i = 0; i < 16; i++) {
      arrHTMatrices.push(m[i]);
    }
  });
}

function createAMatrix(){
  const PAi = glMatrix.mat4.create();
  const PA = create4dProj(N, wA, modelViewMatrix);
  glMatrix.mat4.invert(PAi, PA);

  
  const PAiKi = glMatrix.mat4.create();
  
  glMatrix.mat4.multiply(PAiKi, PAi, invIntrinsicCamMatrix);
  glMatrix.mat4.multiply(A, inverseModelViewMatrix, PAiKi);
}

// --------------------Update-Uniforms-------------------------

function updateUniforms() {
  initCamera();
  createHTMatrix();
  createAMatrix();


  gl.uniformMatrix4fv(shaderProgram.modelViewMatrixUniform, false, modelViewMatrix);
  gl.uniformMatrix4fv(shaderProgram.projectionMatrixUniform, false, projectionMatrix);

  gl.uniformMatrix4fv(shaderProgram.arrHTMUniform, false, arrHTMatrices);
  gl.uniform2fv(shaderProgram.arrUvUniform, arrUVs);

  gl.uniformMatrix4fv(shaderProgram.paUniform, false, A);
}

// --------------------Handle-Inputs---------------------------

function handleMouseDown(event) {
    mouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}

function handleMouseUp() {
    mouseDown = false;
}

function updateOrbitalCamera(angleX, angleY, distance){
    cameraPosition[0] = targetPosition[0] + distance * Math.sin(angleX);
    cameraPosition[1] = targetPosition[1] + distance * Math.sin(angleY);
    cameraPosition[2] = targetPosition[2] + distance * Math.cos(angleX);
}

function handleMouseMove(event) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  // Check if the mouse position is over the canvas
  const isOverCanvas = mouseX >= 0 && mouseX <= canvas.width && mouseY >= 0 && mouseY <= canvas.height;
  if (!mouseDown || !isOverCanvas) return;

  const deltaX = event.clientX - lastMouseX;
  const deltaY = event.clientY - lastMouseY;

  if(!cameraMode){
    angleX -= deltaX * 0.01;
    angleY += deltaY * 0.01;

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;

    updateOrbitalCamera(angleX, angleY, distance);
  } else {
    cameraPosition[0] -= deltaX * 0.01;
    cameraPosition[1] += deltaY * 0.01;
  }

  updateUniforms();
  render();
}

function handleMouseWheel(event) {
  if(!cameraMode){
    distance += event.deltaY * 0.1;

    updateOrbitalCamera(angleX, angleY, distance);
  }
  else{
    cameraPosition[2] += event.deltaY * 0.5;
  }

  updateUniforms();
  render();
}

function setCameraPosition() {
  // Get the value from the input box
  let x = document.getElementById("inputX").value;
  let y = document.getElementById("inputY").value;
  let z = document.getElementById("inputZ").value;

  let x_f = parseFloat(x);
  let y_f = parseFloat(y);
  let z_f = parseFloat(z);

  if (!isNaN(x_f) && !isNaN(y_f) && !isNaN(z_f)) {
    if(!cameraMode){
      angleX = x_f;
      angleY = y_f;
      distance = z_f - wF[2];
      updateOrbitalCamera(angleX, angleY, distance);
    } else {
      cameraPosition[0] = x_f;
      cameraPosition[1] = y_f;
      cameraPosition[2] = z_f;

      let d_z = z_f - wF[2];
      distance = Math.sqrt((x_f * x_f) + (y_f * y_f) + (d_z * d_z));
    };
    
    updateUniforms();
    render();

  } else {
      alert("Please enter a valid number.");
  }
}

function setFPosition() {
    // Get the value from the input box
    let f = document.getElementById("inputF").value;

    let F_f = parseFloat(f);

    if (!isNaN(F_f)) {
      distance += wF[2] - F_f;
      wF = glMatrix.vec4.fromValues(0,0,F_f,1);
      targetPosition = glMatrix.vec3.fromValues(0,0,F_f);
      
      
      updateUniforms();
      render();


    } else {
        alert("Please enter a valid number.");
    }
}

function handleArrowKey(){
  if (keys.ArrowUp){
    wF[2] += 5;
  }
  if (keys.ArrowDown){
    wF[2] -= 5;
  }
  updateUniforms();
  render();
}

function handleKeyDown(event){
  if (keys.hasOwnProperty(event.key)) {
    keys[event.key] = true;
    handleArrowKey();
  }
}

function handleKeyUp(event){
  if (keys.hasOwnProperty(event.key)) {
    keys[event.key] = false;
  }
}

function handleFOVSlider(){
  cameraFOV = document.getElementById('slider').value;
  updateUniforms();

  render();
}

function handleCheckBox(){
  cameraMode = document.getElementById('checkbox').checked;
  updateUniforms();
  render();
}


function setupEventListeners() {
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('wheel', handleMouseWheel);

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  document.getElementById('slider').addEventListener('input', handleFOVSlider);
  document.getElementById('checkbox').addEventListener('change', handleCheckBox);
}

function updateText(){
    let data = glMatrix.vec3.fromValues(angleX, angleY, distance);

    document.getElementById("output").textContent= data;
    document.getElementById("position").textContent= cameraPosition;
    document.getElementById('sliderValue').textContent = 'Selected FOV: ' + cameraFOV;
    document.getElementById("plane").textContent = 'Plane Z: ' + wF[2];
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    updateText();
}

function main() {
    canvas = document.getElementById("glcanvas");
    initWebGL(canvas);
    initShaders();

    initBuffers();
    createTextureArray();

    createArrayCameraUV();
  
    updateUniforms();
    
    setupEventListeners();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    render();
}

main();

