
// app.js
let gl;
let shaderProgram;

// --------------------Images----------------------------------

let folderPath = "./imgs"

// --------------------Matrices-------------------------------- 

let modelViewMatrix = glMatrix.mat4.create();
let projectionMatrix = glMatrix.mat4.create();

let cameraPosition = glMatrix.vec3.fromValues(0, 0, 6);
let cameraFOV = 1;
let targetPosition = glMatrix.vec3.fromValues(0, 0, 0);
let upVector = glMatrix.vec3.fromValues(0, 1, 0);

let angleX = 0;
let angleY = 0;
let distance = 6;

let mouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

let N = glMatrix.vec4.fromValues(0,0,1,1);
let wF = glMatrix.vec4.fromValues(0,0,0,1);
let wA = glMatrix.vec4.fromValues(0,0,5,1);


let intrinsicCamMatrix = glMatrix.mat4.create();
let invIntrinsicCamMatrix = glMatrix.mat4.create();
let inverseModelViewMatrix = glMatrix.mat4.create();
let inverseProjectionMatrix = glMatrix.mat4.create();

let arrProjMats = [];
let arrUVs = [];
let arrViewMats = [];

let inverseProjectionAMatrix = glMatrix.mat4.create();

// --------------------Functions-------------------------------

function initWebGL(canvas) {
    gl = canvas.getContext("webgl2");
    if (!gl) {
        console.error("Unable to initialize WebGL. Your browser may not support it.");
        return;
    }
}



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

        uniform mat4 arr_V[4];
        uniform mat4 arr_P[4];
        uniform vec2 arr_uv[4];

        uniform mat4 V_k_i;
        uniform mat4 P_k_i;

        uniform mat4 K;
        uniform mat4 K_i;

        uniform mat4 P_A_i;

        in vec2 vUv;
        out vec4 fragColor;

        void main(void) {
          vec4 p_k = vec4(vUv.x * 2.0 - 1.0, 1.0 - 2.0 * vUv.y,  0 , 1);


          vec4 w_a = V_k_i * P_A_i * p_k;
          vec3 tex = vec3(0.0, 0.0, 0.0);
          float validPixelCount = 0.0;

          for (int i = 0; i < 4; i++){
            vec4 p_i = K * arr_P[i] * arr_V[i] * V_k_i * P_k_i * K_i * p_k;

            float w_x = w_a.x - arr_uv[i].x;
            float w_y = w_a.y - arr_uv[i].y;
            float d = ((w_x * w_x) + (w_y * w_y));

            vec2 uv = vec2((p_i.x + 1.0) / 2.0, (1.0 - p_i.y) / 2.0);
            if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
              float contribution = (1.0 / (1.0 + (d*d)));
              tex += vec3(texture(uSampler, vec3(uv, i)).rgb) * contribution;
              validPixelCount += contribution;
            }
          }
          fragColor = vec4(tex, 1.0) / validPixelCount; 
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

    shaderProgram.vkiUniform = gl.getUniformLocation(shaderProgram, "V_k_i");
    shaderProgram.pkiUniform = gl.getUniformLocation(shaderProgram, "P_k_i");
    gl.uniformMatrix4fv(shaderProgram.vkiUniform, false, inverseModelViewMatrix);
    gl.uniformMatrix4fv(shaderProgram.pkiUniform, false, inverseProjectionMatrix);

    shaderProgram.kUniform = gl.getUniformLocation(shaderProgram, "K");
    shaderProgram.kiUniform = gl.getUniformLocation(shaderProgram, "K_i");
    gl.uniformMatrix4fv(shaderProgram.kUniform, false, intrinsicCamMatrix);
    gl.uniformMatrix4fv(shaderProgram.kiUniform, false, invIntrinsicCamMatrix);

    shaderProgram.arrViewUniform = gl.getUniformLocation(shaderProgram, "arr_V");
    shaderProgram.arrProjUniform = gl.getUniformLocation(shaderProgram, "arr_P");
    shaderProgram.arrUvUniform = gl.getUniformLocation(shaderProgram, "arr_uv");

    shaderProgram.paUniform = gl.getUniformLocation(shaderProgram, "P_A_i");
    gl.uniformMatrix4fv(shaderProgram.paUniform, false, inverseProjectionAMatrix);

    // Create texture

    createTextureArray()

    const samplerArrayLocation = gl.getUniformLocation(shaderProgram, 'uSampler');
    gl.uniform1i(samplerArrayLocation, 0);
}

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

function create4dProj(normal, point, viewMatrix){
  const normal_c_4 = glMatrix.vec4.create();
  glMatrix.vec4.transformMat4(normal_c_4, normal, viewMatrix);
  const normal_c = glMatrix.vec3.create();
  glMatrix.vec3.copy(normal_c, normal_c_4);

  const point_c_4 = glMatrix.vec4.create();
  glMatrix.vec4.transformMat4(point_c_4, point, viewMatrix);
  const point_c = glMatrix.vec3.create();
  glMatrix.vec3.copy(point_c, point_c_4);

  return glMatrix.mat4.fromValues(
    1.0, 0.0, 0.0, 0.0,
    0.0, 1.0, 0.0, 0.0,
    normal_c[0], normal_c[1], normal_c[2], -glMatrix.vec3.dot(normal_c, point_c),
    0.0, 0.0, 1.0, 0.0
    );
}

function createInCamMatrix(width, height, projD){
  return glMatrix.mat4.fromValues(
    width / projD, 0, 0, width / 2,
    0, -width / projD, 0, height / 2,
    0, 0, 1, 0,
    0, 0, 0, 1
  );
}



function initCamera() {
    glMatrix.mat4.lookAt(modelViewMatrix, cameraPosition, targetPosition, upVector);
    glMatrix.mat4.invert(inverseModelViewMatrix, modelViewMatrix);
    glMatrix.mat4.perspective(projectionMatrix, Math.PI / 4, gl.canvas.width / gl.canvas.height, 0.1, 10);

    let floatD = Math.tan(cameraFOV / 2 * Math.PI * 180);
    intrinsicCamMatrix = createInCamMatrix(1400, 800, floatD);
    glMatrix.mat4.invert(invIntrinsicCamMatrix, intrinsicCamMatrix);
    
    p1 = create4dProj(N, wF, modelViewMatrix);
    glMatrix.mat4.invert(inverseProjectionMatrix, p1);

    A = create4dProj(N, wA, modelViewMatrix);
    glMatrix.mat4.invert(inverseProjectionAMatrix, A);
}

function createArrayView(){
  let arrViewMat4s = imgsData.map(item => {
    let arrCamPosition = glMatrix.vec3.fromValues(item.u, item.v, 5);
    let arrCamTarget = glMatrix.vec3.fromValues(item.u, item.v, 0);
    let arrModelViewMatrix = glMatrix.mat4.create();

    glMatrix.mat4.lookAt(arrModelViewMatrix, arrCamPosition, arrCamTarget, upVector);

    return arrModelViewMatrix ;
  });

  let flatArrViewMats = [];
  arrViewMat4s .forEach(m => {
    for (let i = 0; i < 16; i++) {
      flatArrViewMats.push(m[i]);
    }
  });
  return flatArrViewMats;
}


function createArrayCameraProj(normal, wF){
  let arrProjMat4s = imgsData.map(item => {
    let arrCamPosition = glMatrix.vec3.fromValues(item.u, item.v, 5);
    let arrCamTarget = glMatrix.vec3.fromValues(item.u, item.v, 0);
    let arrModelViewMatrix = glMatrix.mat4.create();

    glMatrix.mat4.lookAt(arrModelViewMatrix, arrCamPosition, arrCamTarget, upVector);
    return create4dProj(normal, wF, arrModelViewMatrix);
  });

  let flatArrProjMats = [];
  arrProjMat4s.forEach(m => {
    for (let i = 0; i < 16; i++) {
      flatArrProjMats.push(m[i]);
    }
  });
  return flatArrProjMats
}

function createArrayCameraUV(){
  let  flatArrUvs = [];
  imgsData.map(item => {
    flatArrUvs.push(parseFloat(item.u));
    flatArrUvs.push(parseFloat(item.v));
  });
  return flatArrUvs;
}

function initArrayCameras (){
    arrViewMats = createArrayView(N, wF);
    gl.uniformMatrix4fv(shaderProgram.arrViewUniform, false, arrViewMats);

    arrProjMats = createArrayCameraProj(N, wF);
    gl.uniformMatrix4fv(shaderProgram.arrProjUniform, false, arrProjMats);

    arrUVs = createArrayCameraUV();
    gl.uniform2fv(shaderProgram.arrUvUniform, arrUVs);

}

function handleMouseDown(event) {
    mouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}

function handleMouseUp() {
    mouseDown = false;
}

function handleMouseMove(event) {
    if (!mouseDown) return;

    const deltaX = event.clientX - lastMouseX;
    const deltaY = event.clientY - lastMouseY;

    angleX -= deltaX * 0.01;
    angleY += deltaY * 0.01;

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;

    updateCamera();
    render();
}

function handleMouseWheel(event) {
    distance += event.deltaY * 0.1;
    updateCamera();
    render();
}

function updateCamera() {
    cameraPosition[0] = targetPosition[0] + distance * Math.sin(angleX);
    cameraPosition[1] = targetPosition[1] + distance * Math.sin(angleY);
    cameraPosition[2] = targetPosition[2] + distance * Math.cos(angleX);

    glMatrix.mat4.lookAt(modelViewMatrix, cameraPosition, targetPosition, upVector);
    glMatrix.mat4.invert(inverseModelViewMatrix, modelViewMatrix);

    p1 = create4dProj(N, wF, modelViewMatrix);
    glMatrix.mat4.invert(inverseProjectionMatrix, p1);

    A = create4dProj(N, wA, modelViewMatrix);
    glMatrix.mat4.invert(inverseProjectionAMatrix, A);
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
      angleX = x_f;
      angleY = y_f;
      distance = z_f - wF[2];
      
      updateCamera();
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
      
      
      updateCamera();
      initArrayCameras();
      render();


    } else {
        alert("Please enter a valid number.");
    }
}

function setupEventListeners() {
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('wheel', handleMouseWheel);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(shaderProgram.modelViewMatrixUniform, false, modelViewMatrix);
    gl.uniformMatrix4fv(shaderProgram.projectionMatrixUniform, false, projectionMatrix);

    gl.uniformMatrix4fv(shaderProgram.vkiUniform, false, inverseModelViewMatrix);
    gl.uniformMatrix4fv(shaderProgram.pkiUniform, false, inverseProjectionMatrix);
    gl.uniformMatrix4fv(shaderProgram.paUniform, false, inverseProjectionAMatrix);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    let data = glMatrix.vec3.fromValues(angleX, angleY, distance);

    document.getElementById("output").textContent= data;
    document.getElementById("position").textContent= cameraPosition;
}

function main() {
    const canvas = document.getElementById("glcanvas");
    initWebGL(canvas);
    initShaders();
    initBuffers();
    initCamera();
    initArrayCameras();
    setupEventListeners();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    render();
}

main();

