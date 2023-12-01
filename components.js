// HTML component to display when in XYZ mode
let xyzComponent = document.createElement('div');
xyzComponent.id = 'xyz';

// HTML component to display when in orbital mode
let orbitalComponent = document.createElement('div');
orbitalComponent.id = 'orbital';


function createXYZControls(){
  // Creates the inputs for X, Y, Z coordinates of the camera
  const placeholders = ["X", "Y", "Z"];
  for (let i = 0; i < 3; i++) {
    const inputElement = document.createElement('input');
    inputElement.type = 'number';
    inputElement.placeholder = placeholders[i];
    inputElement.id = placeholders[i];

    xyzComponent.appendChild(inputElement);
  }

  // Creates the corresponding Enter button
  const enterButton = document.createElement('button');
  enterButton.textContent = 'Enter';
  // Adds event listener
  enterButton.addEventListener('click', setXYZCameraPosition);
  xyzComponent.appendChild(enterButton);

  // Component to dislpay information
  const spanElement = document.createElement('span');
  spanElement.textContent = ' Camera Coordinates: ';
  xyzComponent.appendChild(spanElement);

  // Component which will contain the camera coordinates
  const outputElement = document.createElement('span');
  outputElement.id = "output";
  xyzComponent.appendChild(outputElement);
}

// Orbital control has two divs
// 1st for coordinate input and display
// 2nd for setting target position z
function createOrbitalControls(){
  // 1st div
  let firstDiv = document.createElement('div');
  // Identical to XYZ div but with different names and event listeners
  const placeholders = ["AngleX", "AngleY", "Distance"];
  for (let i = 0; i < 3; i++) {
    const inputElement = document.createElement('input');
    inputElement.type = 'number';
    inputElement.placeholder = placeholders[i];
    inputElement.id = placeholders[i];

    firstDiv.appendChild(inputElement);
  }

  const coordButton = document.createElement('button');
  coordButton.textContent = 'Enter';
  coordButton.addEventListener('click', setOrbitalCameraPosition);
  firstDiv.appendChild(coordButton);
  
  const coordElement = document.createElement('span');
  coordElement.textContent = ' Orbital Camera Coordinates: ';
  firstDiv.appendChild(coordElement);

  const outputElement = document.createElement('span');
  outputElement.id = "output";
  firstDiv.appendChild(outputElement);
  
  orbitalComponent.appendChild(firstDiv);
  
  // 2nd div
  let secondDiv = document.createElement('div');

  // Single input for Z component
  const targetInputElement = document.createElement('input');
  targetInputElement.type = 'number';
  targetInputElement.placeholder = "Orbital Point Z";
  targetInputElement.id = 'target_input'
  secondDiv.appendChild(targetInputElement);

  // Enter button
  const targetButton = document.createElement('button');
  targetButton.textContent = 'Enter';
  targetButton.addEventListener('click', setTargetPosition);
  secondDiv.appendChild(targetButton);
  
  const targetTextElement = document.createElement('span');
  targetTextElement.textContent = ' Orbital Point Coordinates: ';
  secondDiv.appendChild(targetTextElement);

  const targetElement = document.createElement('span');
  targetElement.id = "target";
  secondDiv.appendChild(targetElement);

  orbitalComponent.appendChild(secondDiv);
}

// Creates both components and attaches the XYZ component first
function initComponents(){
  createXYZControls();
  createOrbitalControls();
  checkbox.insertAdjacentElement('afterend', xyzComponent);
}

// Updates the values to be displayed 
function updateComponents(){
  if(!cameraMode){
    document.getElementById("output").textContent = cameraPosition;
  } else{
    let data = glMatrix.vec3.fromValues(angleX, angleY, distance);
    document.getElementById("output").textContent= data;
    document.getElementById("target").textContent = targetPosition;
  }
  document.getElementById('sliderValue').textContent = 'Selected Aperture: ' + aperture;
  document.getElementById("plane").textContent = 'Plane Z: ' + wF[2];
}
