var start = 0;
var resultInt = [],
    resultFloat = [];
var flag = 0;


// Функция для чтения файла
function read(i) {
    var fr = new FileReader(),
        file = document.querySelector('input').files[i];

    if (!file) {
        alert('Выберите, пожалуйста, файл!');
        return;
    }

    fr.onloadend = function(e) {
        if (e.target.readyState === FileReader.DONE) {
            let tmp = e.target.result;
            resultInt[i] = (new Int32Array(tmp));
            resultFloat[i] = (new Float32Array(tmp));
        }
        flag++;
        generateWorkObjects();
    };
    fr.readAsArrayBuffer(file);
}




// вычисление спектра
function generateSpectre(data) {
    var fft = new FFT(data.selectionSize, data.frequencyResolution);

    let signal = data.data.slice(0, data.selectionSize);

    fft.forward(signal);
    var spectrum = fft.spectrum;
    var res = [];
    for (var i = 0; i < spectrum.length; i++) {
        res[i] = [i, spectrum[i]];
    }
    getHighchart('#amplitude-area-chart', 'Амплитудный спектр сигнала', 'Амлитуда : частота', res);


    var real = fft.real;
    var imag = fft.imag;
    for (var i = 0; i < real.length / 4; i++) {
        real[i] = 0;
    }
    for (var i = real.length - real.length / 4; i < real.length; i++) {
        real[i] = 0;
    }

    var buffer = fft.inverse(real, imag);
    var res1 = [];
    for (var i = 0; i < buffer.length; i++) {
        res1[i] = [i, buffer[i]];
    }
    getHighchart('#original-chart', 'Отфильтрованный сигнал', 'Время : значение', res1);

    calculateParams(buffer, '#filteredParams', buffer.length);

    getHistogram(data.data, data);
}

// вычисление параметров сигнала
function calculateParams(data, selector, selectionSize) {
    // Максимальное значение сигнала
    let min = max = data[0];

    // Постоянная составляющая
    let constant = 0.0;

    // Среднее квадратическое значение (СКЗ)
    let skz = 0.0;

    for (let i = 0; i < selectionSize && i < data.length; i++) {
        let cur = data[i];

        if (min > cur) {
            min = cur;
        }
        if (max < cur) {
            max = cur;
        }

        constant += cur;

        skz += cur * cur;
    }
    let razmah = max - min;
    constant /= selectionSize;
    skz = Math.sqrt(skz / selectionSize);

    let pik = Math.max(Math.abs(min), Math.abs(max)) / skz;

    $(selector + ' .max').text(max);
    $(selector + ' .min').text(min);
    $(selector + ' .razmah').text(razmah);
    $(selector + ' .constant').text(constant);
    $(selector + ' .skz').text(skz);
    $(selector + ' .pik').text(pik);
}

// рисование графика
function getHighchart(selector, title, series, data) {
    $(selector).highcharts({
        chart: {
            zoomType: 'x'
        },
        title: {
            text: title
        },
        subtitle: {
            text: document.ontouchstart === undefined ?
                'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in'
        },
        xAxis: {
            type: 'number'
        },
        yAxis: {
            title: {
                text: 'Value'
            }
        },
        legend: {
            enabled: false
        },
        plotOptions: {
            area: {
                fillColor: {
                    linearGradient: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 1
                    },
                    stops: [
                        [0, Highcharts.getOptions().colors[0]],
                        [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                    ]
                },
                marker: {
                    radius: 2
                },
                lineWidth: 1,
                states: {
                    hover: {
                        lineWidth: 1
                    }
                },
                threshold: null
            }
        },

        series: [{
            type: 'area',
            name: series,
            data: data
        }]
    });
}

function getSpectrum(signal, cutOffFrequency, func){
    var res = [],
        j;

    for (j = 0; j < cutOffFrequency; j++) {
        res[j] = 2 * signal.reduce(function(sum, point, i) {
            return sum + point * func(2 * Math.PI * i * j / signal.length);
        }) / signal.length;
    }

    return res;
}

function getAmplSpectrum(frame, cutOffFrequency){
    var res = [],
        j,
        cosSpectrum = getSpectrum(frame, cutOffFrequency, Math.cos),
        sinSpectrum = getSpectrum(frame, cutOffFrequency, Math.sin);

    for (j = 0; j <= cutOffFrequency - 1; j++) {
        res[j] = Math.sqrt(Math.pow(sinSpectrum[j], 2) + Math.pow(cosSpectrum[j], 2));
    }

    return res;
}

function getHistogram(data, opt) {
    var min = max = data[0];
    for (var i = 0; i < data.length; i++) {
        if (min > data[i]) {
            min = data[i];
        }
        if (max < data[i]) {
            max = data[i];
        }
    }

    var cat = [],
        result = [];

    let step = 30;

    for (var tmp = min; tmp < max + (max - min) / (step+1); tmp += (max - min) / step) {
        cat.push(tmp.toFixed(4));
        result.push(0);
    }

    for (var i = 0; i < data.length; i++) {
        for (var j = 0; j < cat.length; j++) {
            if (data[i] <= cat[j]) {
                result[j]++;
                break;
            }
        }
    }


    $('#histogramm').highcharts({
        chart: {
            type: 'column'
        },
        title: {
            text: 'Гистограмма амплитуд'
        },
        xAxis: {
            categories: cat,
            crosshair: true
        },
        yAxis: {
            min: 0,
            title: {
                text: 'Количество'
            }
        },
        tooltip: {
            headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
            pointFormat: '<tr><td style="color:{series.color};padding:0"></td>' +
                '<td style="padding:0"><b>{point.y:.0f}</b></td></tr>',
            footerFormat: '</table>',
            shared: true,
            useHTML: true
        },
        plotOptions: {
            column: {
                pointPadding: 0.2,
                borderWidth: 0
            }
        },
        series: [{
            name: 'Амплитуда',
            data: result
        }]
    });
}

// генерирование рабочих объектов
function generateWorkObjects() {
    if (flag < document.querySelector('input').files.length) {
        return;
    }
    var result = [];
    var detailChart;
    for (let i = 0; i < resultInt.length; i++) {
        result[i] = {
            signature: "TMB1",
            channelCount: resultInt[i][1],
            selectionSize: resultInt[i][2],
            spectralLineCount: resultInt[i][3],
            srezFreq: resultInt[i][4],
            frequencyResolution: resultFloat[i][5],
            blockTime: resultFloat[i][6],
            totalTime: resultInt[i][7],
            gotBlocksCountUser: resultInt[i][8],
            dataSize: resultInt[i][9],
            gotBlocksCountSystem: resultInt[i][10],
            maxValue: resultFloat[i][11],
            minValue: resultFloat[i][12],
            data: resultFloat[i].slice(13),
            dataXY: []
        };

        for (let j = 0; j < result[i].data.length; j++) {
            result[i].dataXY[j] = [result[i].blockTime * j, result[i].data[j]];
        }
    }

    getHighchart('#dropzone', 'График временных реализаций', 'Время : значение', result[0].dataXY);
    calculateParams(result[0].data, '#signalParams', result[0].selectionSize);
    generateSpectre(result[0], result[4]);
}

// обработчик выбора файлов
function onFilesSelect(e) {
    var files = e.target.files,
        fr,
        file,
        data;

    flag = 0;
    for (var i = 0; i < files.length; i++) {
        file = files[i];
        read(i);
    }
}

// отслеживание появления файлов
if (window.File && window.FileReader && window.FileList && window.Blob) {
    onload = function() {
        document.querySelector('input').addEventListener('change', onFilesSelect, false);

        var dropZone = document.getElementById('dropzone');
        dropZone.addEventListener('dragover', function(e) {
            e.stopPropagation();
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }, false);
        dropZone.addEventListener('drop', function(e) {
            e.stopPropagation();
            e.preventDefault();
            onFilesSelect(e);
        }, false);
    }
    // если нет, то предупреждаем, что демо работать не будет
} else {
    alert('К сожалению ваш браузер не поддерживает file API');
}
