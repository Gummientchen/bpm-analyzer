var myChart;
var dropArea;
var dropAreaText;
var graphArea;
// var dropArea = document.getElementById("drop-area");
// var graphArea = document.querySelector(".graph-area");

const CSVToArray = (data, delimiter = ",", omitFirstRow = false) =>
  data
    .slice(omitFirstRow ? data.indexOf("\n") + 1 : 0)
    .split("\n")
    .map((v) => v.split(delimiter));

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

    const mv = movingMax(csvArray);
    const data = getData(mv);

    console.log(data);

    const DateTime = luxon.DateTime;
    const chartDate = DateTime.fromMillis(data[0]["x"]);
    const subtitle = chartDate.toISO();

    createGraph(data, file.name, subtitle);
  });

  if (file) {
    dropArea.style.display = "none";
    dropAreaText.style.display = "none";
    graphArea.style.display = "block";

    reader.readAsText(file);
  }
}

function movingMax(data) {
  const average = Math.round(data.length / 75);
  const movingAverage = [];

  if (data.length > 75 * 5) {
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
  } else {
    return data;
  }

  return movingAverage;
}

function getData(csvArray) {
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

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function createGraph(pointData, title, subtitle) {
  const ctx = document.getElementById("graph").getContext("2d");

  let width, height, gradient;
  function getGradient(ctx, chartArea) {
    const chartWidth = chartArea.right - chartArea.left;
    const chartHeight = chartArea.bottom - chartArea.top;
    if (!gradient || width !== chartWidth || height !== chartHeight) {
      // Create the gradient because this is either the first render
      // or the size of the chart has changed
      width = chartWidth;
      height = chartHeight;
      gradient = ctx.createLinearGradient(
        0,
        chartArea.bottom,
        0,
        chartArea.top
      );
      gradient.addColorStop(0, "green");
      gradient.addColorStop(0.5, "yellow");
      gradient.addColorStop(1, "red");
    }

    return gradient;
  }

  let textColor = "#eee";
  let gridColor = "#444";

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

  myChart = new Chart(ctx, {
    type: "line",
    color: "#eee",
    data: {
      datasets: [
        {
          borderColor: "hsl(191, 83%, 60%)",
          // borderColor: function (context) {
          //   const chart = context.chart;
          //   const { ctx, chartArea } = chart;

          //   if (!chartArea) {
          //     // This case happens on initial chart load
          //     return;
          //   }
          //   return getGradient(ctx, chartArea);
          // },
          borderWidth: 2,
          data: pointData,
          label: "BPM (moving max)",
          radius: 2,
          tension: 0.5,
          trendlineLinear: {
            style: "hsl(191, 83%, 50%)",
            lineStyle: "dotted",
            width: 1,
          },
        },
      ],
    },
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
          // adapters: {
          //   date: {
          //     zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          //   },
          // },
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
  dropArea.addEventListener(
    "change",
    (event) => {
      // event.stopPropagation();
      // event.preventDefault();
      // console.log("file selected");
      const fileList = dropArea.files;

      // console.log(fileList);

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

  const resetButton = document.getElementById("reset");
  resetButton.addEventListener("click", (event) => {
    myChart.destroy();

    dropArea.value = null;

    dropAreaText.style.display = "flex";
    graphArea.style.display = "none";
  });
}

window.addEventListener("load", (event) => {
  dropArea = document.getElementById("drop-area");
  dropAreaText = document.querySelector(".drop-area-text");
  graphArea = document.querySelector(".graph-area");

  init();
});
