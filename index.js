
// app.js
let gl;
let shaderProgram;

// --------------------Images----------------------------------

let folderPath = "./imgs"

// --------------------Matrices-------------------------------- 

let modelViewMatrix = glMatrix.mat4.create();
let projectionMatrix = glMatrix.mat4.create();

let cameraPosition = glMatrix.vec3.fromValues(0, 0, 6);
let targetPosition = glMatrix.vec3.fromValues(0, 0, 0);
let upVector = glMatrix.vec3.fromValues(0, 1, 0);

let angleX = 0;
let angleY = 0;
let distance = 6;

let mouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

let N = glMatrix.vec4.fromValues(0,0,1,1);
let wF = glMatrix.vec4.fromValues(0,0,1,1);
let wA = glMatrix.vec4.fromValues(0,0,5,1);


let inverseModelViewMatrix = glMatrix.mat4.create();
let inverseProjectionMatrix = glMatrix.mat4.create();

let modelViewMatrix2 = glMatrix.mat4.create();
let projectionMatrix2 = glMatrix.mat4.create();
let camera2Position = glMatrix.vec3.fromValues(0, 0, 5);

let inverseProjectionAMatrix = glMatrix.mat4.create();

// --------------------Functions-------------------------------

function initWebGL(canvas) {
    gl = canvas.getContext("webgl2");
    if (!gl) {
        console.error("Unable to initialize WebGL. Your browser may not support it.");
        return;
    }
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


async function createTextureArray(){

  //imgs = await Promise.all(imgsData.map(item => loadImage(item.src)))

  var colors = [
    [0, 0, 255, 255],
    [0, 255, 0, 255],
    [255, 0, 0, 255],
    [0, 255, 255, 255],
  ];
  var texture = gl.createTexture();
  gl.bindTexture( gl.TEXTURE_2D_ARRAY, texture );
  gl.texParameteri( gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
  gl.texParameteri( gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
  gl.texParameteri( gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
  gl.texParameteri( gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR );

  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, 1, 1, colors.length);

  for (var i = 0; i < colors.length; i++) {
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0,0,0, i, 1, 1 ,1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(colors[i]));
  }

  updateCamera();
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

        uniform mat4 V_k_i;
        uniform mat4 P_k_i;
        uniform mat4 V_i;
        uniform mat4 P_i;
        uniform mat4 P_A_i;

        in vec2 vUv;
        out vec4 fragColor;

        void main(void) {
          vec4 p_k = vec4(vUv.x * 2.0 - 1.0, 1.0 - 2.0 * vUv.y,  0 , 1);

          vec4 p_i = P_i * V_i * V_k_i * P_k_i * p_k;

          vec4 w_a = V_k_i * P_A_i * p_k;
          float d = ((w_a.x * w_a.x) + (w_a.y * w_a.y));

          vec2 uv = vec2((p_i.x + 1.0) / 2.0, (1.0 - p_i.y) / 2.0);
          vec3 tex = vec3(0.0, 0.0, 0.0);
          if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
            tex = vec3(texture(uSampler, vec3(uv, 0.0)).rgb) * (1.0 - d);
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
    gl.enableVertexAttribArray(shaderProgram.positionAttribute);

    shaderProgram.uvAttribute = gl.getAttribLocation(shaderProgram, 'uv');
    gl.enableVertexAttribArray(shaderProgram.uvAttribute);

    shaderProgram.modelViewMatrixUniform = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
    shaderProgram.projectionMatrixUniform = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");

    shaderProgram.vkiUniform = gl.getUniformLocation(shaderProgram, "V_k_i");
    shaderProgram.pkiUniform = gl.getUniformLocation(shaderProgram, "P_k_i");
    gl.uniformMatrix4fv(shaderProgram.vkiUniform, false, inverseModelViewMatrix);
    gl.uniformMatrix4fv(shaderProgram.pkiUniform, false, inverseProjectionMatrix);

    shaderProgram.viUniform = gl.getUniformLocation(shaderProgram, "V_i");
    shaderProgram.piUniform = gl.getUniformLocation(shaderProgram, "P_i");
    gl.uniformMatrix4fv(shaderProgram.viUniform, false, modelViewMatrix2);
    gl.uniformMatrix4fv(shaderProgram.piUniform, false, projectionMatrix2);

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

function initCamera() {
    glMatrix.mat4.lookAt(modelViewMatrix, cameraPosition, targetPosition, upVector);
    glMatrix.mat4.invert(inverseModelViewMatrix, modelViewMatrix);
    glMatrix.mat4.perspective(projectionMatrix, Math.PI / 4, gl.canvas.width / gl.canvas.height, 0.1, 10);
    
    p1 = create4dProj(N, wF, modelViewMatrix);
    glMatrix.mat4.invert(inverseProjectionMatrix, p1);

    glMatrix.mat4.lookAt(modelViewMatrix2, camera2Position, targetPosition, upVector);
    p2 = create4dProj(N, wF, modelViewMatrix2);
    glMatrix.mat4.copy(projectionMatrix2, p2);

    A = create4dProj(N, wA, modelViewMatrix);
    glMatrix.mat4.invert(inverseProjectionAMatrix, A);
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
}

function handleMouseWheel(event) {
    distance += event.deltaY * 0.1;
    updateCamera();
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
      angleX = x_f;
      angleY = y_f;
      distance = z_f;
      
      updateCamera();

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
}

function main() {
    const canvas = document.getElementById("glcanvas");
    initWebGL(canvas);
    initShaders();
    initBuffers();
    initCamera();
    setupEventListeners();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    render();
}

main();

