// console.log("BPMAnalyzer");

var myChart;

const CSVToArray = (data, delimiter = ",", omitFirstRow = false) =>
  data
    .slice(omitFirstRow ? data.indexOf("\n") + 1 : 0)
    .split("\n")
    .map((v) => v.split(delimiter));

function getMetadataForFileList(fileList) {
  for (const file of fileList) {
    // Not supported in Safari for iOS.
    const name = file.name ? file.name : "NOT SUPPORTED";
    // Not supported in Firefox for Android or Opera for Android.
    const type = file.type ? file.type : "NOT SUPPORTED";
    // Unknown cross-browser support.
    const size = file.size ? file.size : "NOT SUPPORTED";
    // console.log({ file, name, type, size });
  }
}

function readCsv(file) {
  // Check if the file is a csv.
  if (file.type && !file.type.startsWith("application/")) {
    console.log("File is not a CSV.", file.type, file);
    return;
  }

  const dropArea = document.getElementById("drop-area");
  const graphArea = document.querySelector(".graph-area");

  const content = document.querySelector(".graph");

  const reader = new FileReader();
  reader.addEventListener("load", (event) => {
    const csv = reader.result;

    const csvTrim = csv.trim();

    let csvArray = CSVToArray(csvTrim, ";", true);
    // console.log(csvArray);
    // content.innerHTML = csv;

    // csvArray = csvArray.pop();

    // createGraph(getBpm(csvArray), getLabels(csvArray), getSamples(csvArray));

    const mv = movingAverage(csvArray);
    const data = getData(mv);
    // const data = getData(csvArray);

    // console.log(data);

    createGraph(data);
  });

  if (file) {
    dropArea.style.display = "none";
    graphArea.style.display = "block";

    reader.readAsText(file);
  }
}

function movingAverage(data) {
  const average = Math.round(data.length / 75);
  const movingAverage = [];

  for (i = 0; i < data.length - average; i += average) {
    const datapoints = data.slice(i, average + i);

    // console.log(datapoints);

    let ma = 0;
    for (const p of datapoints) {
      ma += parseInt(p[2]);
    }

    ma /= average;

    let point = [datapoints[0][0], 0, ma];

    movingAverage.push(point);
  }

  return movingAverage;
}

function getBpm(csvArray) {
  let bpm = [];

  for (const row of csvArray) {
    bpm.push(row[2]);
  }

  return bpm;
}

function getAbsoluteMinBpm(csvArray) {
  let lowest = 500;

  for (const row of csvArray) {
    if (row[2] < lowest) {
      lowest = row[2];
    }
  }

  return lowest;
}

function getAbsoluteMaxBpm(csvArray) {
  let biggest = 0;

  for (const row of csvArray) {
    if (row[2] > biggest) {
      biggest = row[2];
    }
  }

  return biggest;
}

function getLabels(csvArray) {
  const DateTime = luxon.DateTime;

  let labels = [];
  for (const row of csvArray) {
    let time = DateTime.fromFormat(String(row[0]), "dd.LL.yyyy HH:mm:ss", {
      zone: "utc",
    });
    labels.push(time);
  }

  return labels;
}

function getSamples(csvArray) {
  const items = csvArray.length;
  const maxSamples = 5;

  return Math.round(items / maxSamples);
}

function getData(csvArray) {
  const DateTime = luxon.DateTime;

  let data = [];
  for (const row of csvArray) {
    const time = DateTime.fromFormat(String(row[0]), "dd.LL.yyyy HH:mm:ss", {
      zone: "utc",
    });

    const bpm = parseInt(row[2]);

    data.push({
      x: time.toMillis(),
      y: bpm,
    });
  }

  return data;
}

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function createGraph(pointData) {
  const ctx = document.getElementById("graph").getContext("2d");

  myChart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          borderColor: "hsl(75, 100%, 50%)",
          borderWidth: 1,
          data: pointData,
          label: "BPM",
          radius: 2,
          tension: 0.5,
          trendlineLinear: {
            style: "hsl(90, 100%, 50%)",
            lineStyle: "dotted",
            width: 1,
          },
        },
      ],
    },
    // data: {
    //   labels: labels,
    //   datasets: [
    //     {
    //       label: "BPM (over 120 measures)",
    //       data: data,
    //       borderWidth: 1,
    //       fill: false,
    //       borderColor: "hsl(75, 100%, 50%)",
    //       tension: 0.1,
    //     },
    //   ],
    // },
    options: {
      animation: false,
      parsing: false,
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
      plugins: {
        decimation: {
          enabled: false,
          algorithm: "lttb",
          samples: 150,
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            tooltipFormat: "dd.LL.yyyy HH:mm:ss",
            displayFormats: {
              quarter: "MMM YYYY",
              minute: "HH:mm",
              second: "HH:mm:ss",
              hour: "HH:mm",
              day: "dd.LL.yyyy HH:mm",
            },
          },
          ticks: {
            source: "auto",
            // Disabled rotation for performance
            maxRotation: 90,
            minRotation: 0,
            autoSkip: true,
          },
        },
      },
    },
  });

  const resetButton = document.getElementById("reset");
  resetButton.addEventListener("click", (event) => {
    myChart.destroy();

    const dropArea = document.getElementById("drop-area");
    const graphArea = document.querySelector(".graph-area");

    dropArea.style.display = "block";
    graphArea.style.display = "none";
  });
}

function init() {
  // console.log("ready");

  const dropArea = document.getElementById("drop-area");
  const graphArea = document.getElementById("graph");

  dropArea.addEventListener("dragover", (event) => {
    event.stopPropagation();
    event.preventDefault();
    // Style the drag-and-drop as a "copy file" operation.
    event.dataTransfer.dropEffect = "copy";
  });

  dropArea.addEventListener("drop", (event) => {
    event.stopPropagation();
    event.preventDefault();
    const fileList = event.dataTransfer.files;
    // console.log(fileList);

    getMetadataForFileList(fileList);

    for (const file of fileList) {
      readCsv(file);
    }
  });

  graphArea.addEventListener("dragover", (event) => {
    event.stopPropagation();
    event.preventDefault();
    // Style the drag-and-drop as a "copy file" operation.
    event.dataTransfer.dropEffect = "copy";
  });

  graphArea.addEventListener("drop", (event) => {
    myChart.destroy();

    event.stopPropagation();
    event.preventDefault();
    const fileList = event.dataTransfer.files;
    // console.log(fileList);

    getMetadataForFileList(fileList);

    for (const file of fileList) {
      readCsv(file);
    }
  });
}

window.addEventListener("load", (event) => {
  init();
});
