// --------------------Check-Box-------------------------------

function handleCheckBox(){
  let checkbox = document.getElementById('checkbox'); 
  cameraMode = checkbox.checked;
  // Depending on the camera mode a different html element is shown
  // camera position is set so that there is a relatively smooth transistion
  // between modes
  if(!cameraMode){
    document.getElementById("orbital").remove();
    checkbox.insertAdjacentElement('afterend', xyzComponent);
    cameraPosition[0] = 0;
    cameraPosition[1] = 0;
    cameraPosition[2] = targetPosition[2] + distance;
  }else{
    document.getElementById("xyz").remove();
    checkbox.insertAdjacentElement('afterend', orbitalComponent);
    angleX = 0;
    angleY = 0;
    x = cameraPosition[0] - targetPosition[0]
    y = cameraPosition[1] - targetPosition[1]
    z = cameraPosition[2] - targetPosition[2]

    distance = Math.sqrt((x * x) + (y * y) + (z * z));
    updateOrbitalCamera();
  }

  updateUniforms();
  render();
  updateComponents();
}

// --------------------Mouse-Inputs----------------------------

function handleMouseDown(event) {
    mouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}

function handleMouseUp() {
    mouseDown = false;
}

function handleMouseMove(event) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  // Check if the mouse position is over the canvas
  const isOverCanvas = mouseX >= 0 && mouseX <= canvas.width && mouseY >= 0 && mouseY <= canvas.height;
  if (!mouseDown || !isOverCanvas || !cameraMode) return;

  const deltaX = event.clientX - lastMouseX;
  const deltaY = event.clientY - lastMouseY;

  angleX -= deltaX * 0.001;
  angleY += deltaY * 0.001;

  lastMouseX = event.clientX;
  lastMouseY = event.clientY;

  clampOrbitalCamera();
  updateOrbitalCamera();

  updateUniforms();
  render();
  updateComponents();
}

// --------------------Mouse-Wheel-----------------------------

function handleMouseWheel(event) {
  wF[2] -= event.deltaY * 0.5;

  updateUniforms();
  render();
  updateComponents();
}

// --------------------Arrow-Keys------------------------------

function handleArrowKey(){
  if(!cameraMode){
    if (keys.ArrowLeft){
      cameraPosition[0] -= 2;
    }
    if (keys.ArrowRight){
      cameraPosition[0] += 2;
    }
    if (keys.Enter){
      cameraPosition[1] -= 2;
    }
    if (keys.Space){
      cameraPosition[1] += 2;
    }
    if (keys.ArrowUp){
      cameraPosition[2] -= 2;
    }
    if (keys.ArrowDown){
      cameraPosition[2] += 2;
    }
    clampCameraPosition();
  } else {
    if (keys.ArrowUp){
      distance -= 2;
    }
    if (keys.ArrowDown){
      distance += 2;
    }
    clampOrbitalCamera();
    updateOrbitalCamera();
  }
  updateUniforms();
  render();
  updateComponents();
}

function handleKeyDown(event){
  if (keys.hasOwnProperty(event.key)) {
    keys[event.key] = true;
    handleArrowKey();
  }
  if (event.code === 'Space' || event.key === ' ') {
    keys.Space = true;
    handleArrowKey();
  } 
}

function handleKeyUp(event){
  if (keys.hasOwnProperty(event.key)) {
    keys[event.key] = false;
  }
  if (event.code === 'Space' || event.key === ' ') {
    keys.Space = false;
  } 
}

// --------------------Set-Value-Buttons-----------------------

function setXYZCameraPosition() {
  // Get the value from the input box
  let x = document.getElementById("X").value;
  let y = document.getElementById("Y").value;
  let z = document.getElementById("Z").value;

  let x_f = parseFloat(x);
  let y_f = parseFloat(y);
  let z_f = parseFloat(z);

  if (!isNaN(x_f) && !isNaN(y_f) && !isNaN(z_f)) {
    cameraPosition[0] = x_f;
    cameraPosition[1] = y_f;
    cameraPosition[2] = z_f;
    clampCameraPosition();
    
    updateUniforms();
    render();
    updateComponents();

  } else {
      alert("Please enter a valid number.");
  }
}

function setOrbitalCameraPosition() {
  // Get the value from the input box
  let x = document.getElementById("AngleX").value;
  let y = document.getElementById("AngleY").value;
  let d = document.getElementById("Distance").value;

  let x_f = parseFloat(x);
  let y_f = parseFloat(y);
  let d_f = parseFloat(d);

  if (!isNaN(x_f) && !isNaN(y_f) && !isNaN(d_f)) {
    angleX = x_f;
    angleY = y_f;
    distance = d_f;
    clampOrbitalCamera();
    updateOrbitalCamera();
    
    updateUniforms();
    render();
    updateComponents();

  } else {
      alert("Please enter a valid number.");
  }
}

function setTargetPosition(){
  let z = document.getElementById("target_input").value;

  let z_f = parseFloat(z);

  if (!isNaN(z_f)) {
    distance += targetPosition[2] - z_f;
    targetPosition[2] = z_f;
    updateOrbitalCamera();
    updateUniforms();
    render();
    updateComponents();

  } else {
      alert("Please enter a valid number.");
  }
}

function setFPosition() {
    // Get the value from the input box
    let f = document.getElementById("inputF").value;
    let F_f = parseFloat(f);

    if (!isNaN(F_f)) {
      wF = glMatrix.vec4.fromValues(0,0,F_f,1);
      updateUniforms();
      render();
      updateComponents();
    } else {
        alert("Please enter a valid number.");
    }
}

// --------------------FOV-Slider------------------------------

function handleFOVSlider(){
  aperture = document.getElementById('slider').value / 1000;

  updateUniforms();
  render();
  updateComponents();
}

// --------------------Setup-Input-Functions-------------------

function setupEventListeners() {
  document.getElementById('checkbox').addEventListener('change', handleCheckBox);

  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('wheel', handleMouseWheel);

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  document.getElementById('slider').max = maxAperture * 1000; // * 1000 allows for float values
  document.getElementById('slider').addEventListener('input', handleFOVSlider);
}

