//const { glMatrix } = require("gl-matrix");


// app.js
let gl;
let shaderProgram;

let modelViewMatrix = glMatrix.mat4.create();
let projectionMatrix = glMatrix.mat4.create();

let cameraPosition = glMatrix.vec3.fromValues(0, 0, 5);
let targetPosition = glMatrix.vec3.fromValues(0, 0, 0);
let upVector = glMatrix.vec3.fromValues(0, 1, 0);

let angleX = 0;
let angleY = 0;
let distance = 5;

let mouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

let N = glMatrix.vec4.fromValues(0,0,1,1);
let wF = glMatrix.vec4.fromValues(0,0,1,1);


let inverseModelViewMatrix = glMatrix.mat4.create();
let inverseProjectionMatrix = glMatrix.mat4.create();

let modelViewMatrix2 = glMatrix.mat4.create();
let projectionMatrix2 = glMatrix.mat4.create();
let camera2Position = glMatrix.vec3.fromValues(0, 0, 5);

function initWebGL(canvas) {
    gl = canvas.getContext("webgl");
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

function initShaders() {
    const vsSource = `
        precision mediump float;

        attribute vec3 position;
        attribute vec2 uv;

        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;

        varying vec2 vUv;

        void main(void) {
            vUv = uv;
            gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fsSource = `
        precision mediump float;

        uniform sampler2D sampler;
        uniform mat4 V_k_i;
        uniform mat4 P_k_i;
        uniform mat4 V_i;
        uniform mat4 P_i;

        varying vec2 vUv;

        // Camera properties
        vec3 cam_pos = vec3(0.0, 0.0, 5.0);
        vec3 lookAtPosition = vec3(0.0, 0.0, 0.0);
        vec3 upDirection = vec3(0.0, 1.0, 0.0);
  
        void main(void) {
          vec4 p_k = vec4(vUv * 2.0 - 1.0, 0 , 1);

          vec4 p_i = P_i * V_i * V_k_i * P_k_i * p_k;
          vec2 uv = (p_i.xy + 1.0) / 2.0;
          vec3 tex = vec3(0.0, 0.0, 0.0);
          if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
            tex = vec3(texture2D(sampler, uv).rgb);
          }
          gl_FragColor = vec4(tex, 1.0); 
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

    // Create texture
    var texture = gl.createTexture( );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
      gl.UNSIGNED_BYTE,
      document.getElementById( 'Tex' )
    );

    const uSamplerLocation = gl.getUniformLocation(shaderProgram, 'uSampler');
    gl.uniform1i(uSamplerLocation, 0);
    //gl.bindTexture( gl.TEXTURE_2D, null );
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
    gl.vertexAttribPointer(shaderProgram.positionAttribute, 3, gl.FLOAT, false, 0, 0);

    const uvs = [
        0.0, 1.0,
        1.0, 1.0,
        1.0,  0.0,
        0.0,  0.0,
    ];

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
    gl.vertexAttribPointer(shaderProgram.uvAttribute , 2, gl.FLOAT, false, 0, 0);
}

function create4dProj(viewMatrix){
  const N_c_4 = glMatrix.vec4.create();
  glMatrix.vec4.transformMat4(N_c_4, N, viewMatrix);
  const N_c = glMatrix.vec3.create();
  glMatrix.vec3.copy(N_c, N_c_4);

  const wF_c_4 = glMatrix.vec4.create();
  glMatrix.vec4.transformMat4(wF_c_4, wF, viewMatrix);
  const wF_c = glMatrix.vec3.create();
  glMatrix.vec3.copy(wF_c, wF_c_4);

  return glMatrix.mat4.fromValues(
    1.0, 0.0, 0.0, 0.0,
    0.0, 1.0, 0.0, 0.0,
    N_c[0], N_c[1], N_c[2], -glMatrix.vec3.dot(N_c, wF_c),
    0.0, 0.0, 1.0, 0.0
    );
}

function initCamera() {
    glMatrix.mat4.lookAt(modelViewMatrix, cameraPosition, targetPosition, upVector);
    glMatrix.mat4.invert(inverseModelViewMatrix, modelViewMatrix);
    glMatrix.mat4.perspective(projectionMatrix, Math.PI / 4, gl.canvas.width / gl.canvas.height, 0.1, 10);
    
    p1 = create4dProj(modelViewMatrix);
    glMatrix.mat4.invert(inverseProjectionMatrix, p1);

    glMatrix.mat4.lookAt(modelViewMatrix2, camera2Position, targetPosition, upVector);
    p2 = create4dProj(modelViewMatrix2);
    glMatrix.mat4.copy(projectionMatrix2, p2);


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
    p1 = create4dProj(modelViewMatrix);
    glMatrix.mat4.invert(inverseProjectionMatrix, p1);

    console.log(inverseProjectionMatrix)
    render();
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

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
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

