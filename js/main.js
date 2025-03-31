// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/image

// the link to your model provided by Teachable Machine export panel
const URL = "https://teachablemachine.withgoogle.com/models/NKAahniUZ/";
const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const speedo = document.getElementById("speedometer-container");

let model, webcam, labelContainer, maxPredictions, guessContainer;
let nextUpdateTime = 0;

let isIos = false;
// fix when running demo in ios, video will be frozen;
if (
  window.navigator.userAgent.indexOf("iPhone") > -1 ||
  window.navigator.userAgent.indexOf("iPad") > -1
) {
  isIos = true;
}
// Load the image model and setup the webcam
async function init() {
  // Get rid of the start button and replace it with a stop one
  startButton.style.display = "none";
  stopButton.style.display = "inline";
  speedo.style.display = "flex";

  // Ensure Camera Visible
  document.getElementById("webcam-container").innerHTML = "";

  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  // load the model and metadata
  // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
  // or files from your local hard drive
  model = await tmImage.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  // Convenience function to setup a webcam
  const flip = true; // whether to flip the webcam
  const width = 400;
  const height = 400;
  webcam = new tmImage.Webcam(width, height, flip);
  await webcam.setup(); // request access to the webcam

  if (isIos) {
    document.getElementById("webcam-container").appendChild(webcam.webcam); // webcam object needs to be added in any case to make this work on iOS
    // grab video-object in any way you want and set the attributes
    const webCamVideo = document.getElementsByTagName("video")[0];
    webCamVideo.setAttribute("playsinline", true); // written with "setAttribute" bc. iOS bugs otherwise
    webCamVideo.muted = "true";
    webCamVideo.style.width = width + "px";
    webCamVideo.style.height = height + "px";
  } else {
    document.getElementById("webcam-container").appendChild(webcam.canvas);
  }
  // append elements to the DOM
  labelContainer = document.getElementById("label-container");
  guessContainer = document.getElementById("guess-container");
  for (let i = 0; i < maxPredictions; i++) {
    // and class labels
    labelContainer.appendChild(document.createElement("div"));
  }
  webcam.play();
  window.requestAnimationFrame(loop);
}

async function loop() {
  webcam.update(); // update the webcam frame
  await predict();
  window.requestAnimationFrame(loop);
}

// run the webcam image through the image model
async function predict() {
  // predict can take in an image, video or canvas html element
  let prediction, guess, confidence;
  if (isIos) {
    prediction = await model.predict(webcam.webcam);
  } else {
    prediction = await model.predict(webcam.canvas);
  }

  // helper function to create a gradient color from red to green based on probability (0 to 1)
  function getProbabilityColor(probability) {
    const red = Math.round((1 - probability) * 255);
    const green = Math.round(probability * 255);
    return `rgb(${red}, ${green}, 0)`;
  }

  for (let i = 0; i < maxPredictions; i++) {
    const color = getProbabilityColor(prediction[i].probability);
    const classPrediction =
      prediction[i].className +
      ": " +
      `<span style="color: ${color}">${prediction[i].probability.toFixed(2)}</span>`;
    labelContainer.childNodes[i].innerHTML = classPrediction;
  }

  const hotdog = prediction[0].probability;
  const notHotdog = prediction[1].probability;
  if (hotdog > notHotdog) {
    guess = "Hotdog";
    confidence = hotdog;
  } else {
    guess = "Not Hotdog";
    confidence = notHotdog;
  }

  // Update guess and confidence only once every second
  if (Date.now() >= nextUpdateTime) {
    const confColor = guess === "Hotdog" ? "green" : "red";
    guessContainer.innerHTML = `${guess}<br>Confidence: <span style="color: ${confColor}">${(confidence * 100).toFixed(0)}%</span>`;
    // Always use hotdog probability for the speedometer
    animateSpeedometer(hotdog);
    nextUpdateTime = Date.now() + 10;
  }
}

function animateSpeedometer(newValue) {
  const meterElem = document.getElementById("speedometer");
  const currentValue = parseFloat(meterElem.value);
  // If the difference is negligible, set the value and stop animating
  if (Math.abs(newValue - currentValue) < 0.01) {
    meterElem.value = newValue;
    return;
  }
  // Update the meter value gradually (adjust factor for speed)
  const step = (newValue - currentValue) * 0.1;
  meterElem.value = currentValue + step;
  requestAnimationFrame(() => animateSpeedometer(newValue));
}

async function stop() {
  // Stop the webcam and remove it from the DOM
  webcam.stop();
  document.getElementById("webcam-container").innerHTML = "";
  startButton.style.display = "inline";
  stopButton.style.display = "none";
  speedo.style.display = "none";
  labelContainer.innerHTML = ""; // clear labels
  guessContainer.innerHTML = ""; // clear guess
}
