var myChart;
var dropArea;
var dropAreaText;
var graphArea;

const CSVToArray = (data, delimiter = ",", omitFirstRow = false) =>
  data
    .slice(omitFirstRow ? data.indexOf("\n") + 1 : 0)
    .split("\n")
    .map((v) => v.split(delimiter));

// reads the CSV file and makes the data ready for chart.js
function readCsv(file) {
  // Check if the file is a csv.
  if (file.type && !file.type.startsWith("application/")) {
    console.log("File is not a CSV.", file.type, file);
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", (event) => {
    const csv = reader.result;

    const csvTrim = csv.trim();

    let csvArray = CSVToArray(csvTrim, ";", true);

    // only average data if enough data rows exist
    if (csvArray.length > 5 * 120) {
      const mv = movingMax(csvArray);
      var maxData = getData(mv);

      const mm = movingMin(csvArray);
      var minData = getData(mm);
    } else {
      var maxData = getData(csvArray);
      var minData = false;
    }

    // create title and subtitle for the graph
    const DateTime = luxon.DateTime;
    const chartDate = DateTime.fromMillis(maxData[0]["x"]);
    const subtitle = chartDate.toISO();

    createGraph(maxData, minData, file.name, subtitle);
  });

  if (file) {
    dropArea.style.display = "none";
    dropAreaText.style.display = "none";
    graphArea.style.display = "block";

    reader.readAsText(file);
  }
}

// calculates a moving max average from the data
function movingMax(data) {
  const average = Math.round(data.length / 75);
  const movingAverage = [];

  for (i = 0; i < data.length - average; i += average) {
    const datapoints = data.slice(i, average + i);

    let ma = 0;
    for (const p of datapoints) {
      if (ma < parseInt(p[2])) {
        ma = parseInt(p[2]);
      }
    }

    let point = [datapoints[0][0], 0, ma];

    movingAverage.push(point);
  }
  return movingAverage;
}

// calculates a moving min average from the data
function movingMin(data) {
  const average = Math.round(data.length / 75);
  const movingAverage = [];

  for (i = 0; i < data.length - average; i += average) {
    const datapoints = data.slice(i, average + i);

    let ma = 500;
    for (const p of datapoints) {
      if (ma > parseInt(p[2])) {
        ma = parseInt(p[2]);
      }
    }

    let point = [datapoints[0][0], 0, ma];

    movingAverage.push(point);
  }
  return movingAverage;
}

// creates a chart.js compatible array from the csv data
function getData(csvArray) {
  if (csvArray == false) {
    return false;
  } else {
    const DateTime = luxon.DateTime;

    let data = [];
    for (const row of csvArray) {
      const time = DateTime.fromFormat(String(row[0]), "dd.LL.yyyy HH:mm:ss");

      const bpm = parseInt(row[2]);

      data.push({
        x: time.toMillis(),
        y: bpm,
      });
    }

    return data;
  }
}

// creates the visual graph
function createGraph(maxData, minData, title, subtitle) {
  const ctx = document.getElementById("graph").getContext("2d");

  let width, height, gradient;

  // generaly used colors and other settings
  let textColor = "#eee";
  let gridColor = "#444";

  // custom plugin to set graph background
  const plugin = {
    id: "custom_canvas_background_color",
    beforeDraw: (chart) => {
      const ctx = chart.canvas.getContext("2d");
      ctx.save();
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "hsl(240, 2%, 10%)";
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    },
  };

  // check if max and min data is available, depending if enough data points exist
  if (minData !== false) {
    // max and min exist
    var data = {
      datasets: [
        {
          borderColor: "hsl(191, 83%, 60%)",
          borderWidth: 2,
          data: maxData,
          label: "BPM (moving max)",
          radius: 2,
          tension: 0.5,
          trendlineLinear: {
            style: "hsl(191, 83%, 50%)",
            lineStyle: "dotted",
            width: 1,
          },
        },
        {
          borderColor: "hsl(303, 83%, 60%, 0.5)",
          borderWidth: 2,
          data: minData,
          label: "BPM (moving min)",
          radius: 2,
          tension: 0.5,
        },
      ],
    };
  } else {
    // only max exist and is not a moving average of max values
    var data = {
      datasets: [
        {
          borderColor: "hsl(191, 83%, 60%)",
          borderWidth: 2,
          data: maxData,
          label: "BPM",
          radius: 2,
          tension: 0.5,
          trendlineLinear: {
            style: "hsl(191, 83%, 50%)",
            lineStyle: "dotted",
            width: 1,
          },
        },
      ],
    };
  }

  // create chart
  myChart = new Chart(ctx, {
    type: "line",
    color: "#eee",
    data: data,
    options: {
      animation: true,
      parsing: false,
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },

      plugins: {
        legend: {
          labels: {
            color: textColor,
          },
        },
        decimation: {
          enabled: false,
          algorithm: "lttb",
          samples: 150,
        },
        title: {
          display: true,
          text: title,
          color: textColor,
        },
        subtitle: {
          display: true,
          text: subtitle,
          color: textColor,
          font: {
            size: 12,
            weight: "normal",
            style: "italic",
          },
          padding: {
            bottom: 10,
          },
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
            color: textColor,
            source: "auto",
            maxRotation: 90,
            minRotation: 0,
            autoSkip: true,
          },
          grid: {
            color: gridColor,
          },
        },
        y: {
          ticks: {
            color: textColor,
            source: "auto",
            // autoSkip: true,
            maxTicksLimit: 20,
          },
          grid: {
            // color: gridColor,
            color: function (context) {
              if (context.tick.value >= 130) {
                return "rgba(255, 0, 0, 0.5)";
              } else if (context.tick.value >= 100) {
                return "rgba(255, 255, 0, 0.5)";
              } else {
                return "rgba(0, 255, 0, 0.25)";
              }

              return "#000000";
            },
          },
        },
      },
    },
    plugins: [plugin],
  });
}

function init() {
  // register event handler for input
  dropArea.addEventListener(
    "change",
    (event) => {
      const fileList = dropArea.files;

      for (const file of fileList) {
        readCsv(file);
      }
    },
    false
  );

  dropAreaText.addEventListener("dragover", (event) => {
    event.stopPropagation();
    event.preventDefault();
    // Style the drag-and-drop as a "copy file" operation.
    event.dataTransfer.dropEffect = "copy";
  });

  dropAreaText.addEventListener("drop", (event) => {
    event.stopPropagation();
    event.preventDefault();
    const fileList = event.dataTransfer.files;

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

    for (const file of fileList) {
      readCsv(file);
    }
  });

  // create reset button event handler
  const resetButton = document.getElementById("reset");
  resetButton.addEventListener("click", (event) => {
    myChart.destroy();

    dropArea.value = null;

    dropAreaText.style.display = "flex";
    graphArea.style.display = "none";
  });
}

// load when ready
window.addEventListener("load", (event) => {
  dropArea = document.getElementById("drop-area");
  dropAreaText = document.querySelector(".drop-area-text");
  graphArea = document.querySelector(".graph-area");

  init();
});
