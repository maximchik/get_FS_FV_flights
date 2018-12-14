const urlParams = new URLSearchParams(window.location.search)
const airportIata = urlParams.get('iata')

var flightsCount = 0;

new Vue({
    el: '#app',
    data: {
        flightsSourceId: 0,
        flightsSources: [
            {
                id: 'fs',
                name: 'FlightStats',
                htmldata: [],
                termCount: 0,
                gateCount: 0,
                flightsTotal: 0,
                sortField: 'time',
                flightsLoading: false,
                flightsChecked: 0,
                url: (() => {
                    return [1,2,3,4,5,6,7,8].map(el=>{
                        return 'https://www.flightstats.com/go/weblet?guid=34b64945a69b9cac:4e54f19d:141251738d3:-17a3&weblet=status&action=AirportFlightStatus&airportCode='
                                    +airportIata
                                    +'&airportQueryTimePeriod='
                                    +el
                    })
                })(),
                getFlights: function (htmlSource) {
                    $('<span>' + htmlSource + '</span>')
                        .find('.tableListingTable tr')
                        .slice(1)
//                        .filter((i,el) => $(el).text().indexOf("^") === -1)
                        .get()
                        .forEach(el => {
                            let flightNum = $('td:nth-child(1)',el).text().trim()
                            if (!this.htmldata.find(el =>el.flight == flightNum)) {
                                this.htmldata.push({
                                            href: $('td:nth-child(1) a',el).attr('href'),
                                            flight: flightNum,
                                            time: to24h($('td:nth-child(4) a',el).text().trim()),
                                            gate: '?',
                                            terminal: '?',

                                })
                            }
                        })
                },
                getFlightsPages: function () {
                    let dataArray = this.htmldata.map(element => 
                        axios.get(element.href)
                            .then(response => {
                                let hh = $('<span>' + response.data + '</span>').find('[class^="ticket__TerminalGateBagContainer"]')
                                let term = hh.find('[class^="ticket__TGBSection"]:eq(0) > div:eq(1)').eq(0).text()
                                let gate = hh.find('[class^="ticket__TGBSection"]:eq(1) > div:eq(1)').eq(0).text()
                                element.gate = gate=='N/A'?null:gate
                                element.terminal = term=='N/A'?null:term
                                element.gate && this.gateCount++
                                element.terminal && this.termCount++
                                this.flightsChecked++
                            })
                            .catch(error => {
                                console.log(error)
                            })
                            .then(() => {

                            })
                    )
                    axios.all(dataArray)
                    .then(results => {
                        this.flightsLoading = false
                        console.log("End res length: "+results.length)
                    })
                },

            },
            {
                id: 'fv',
                name: 'FlightView',
                htmldata: [],
                termCount: 0,
                gateCount: 0,
                flightsTotal: 0,
                sortField: 'time',
                flightsLoading: false,
                flightsChecked: 0,
                url: ['https://tracker.flightview.com/FVAccess2/tools/fids/fidsDefault.asp?accCustId=FVWebFids&fidsId=20001&fidsInit=departures&fidsFilterAl=&fidsFilterArrap=&fidsApt='+airportIata],
                getFlights: function (htmlSource) {
                    $('<span>' + htmlSource + '</span>')
                        .find('#fvData > table > tbody > tr')
                        .get()
                        .forEach(el => {
                            let termGate = $('.c7',el).text()
                            if (termGate.search(/term/gi) != -1) {
                                termGate = termGate.replace(/term/gi,'').split("-").map(el=>el.trim())
                            } else {
                                termGate = ['',termGate.trim()]
                            }
                            termGate[0] && this.termCount++
                            termGate[1] && this.gateCount++
                            this.flightsChecked++
                            this.htmldata.push({
                                        href: '',
                                        flight: $('.c1',el).text().match(/"(.+)"/i )[1]+" "+$('.c2',el).text().trim(),
                                        time: to24h($('td:nth-child(5)',el).text()),
                                        gate: termGate[1],
                                        terminal: termGate[0]
                                        })
                        })
                },
                getFlightsPages: function () {
                    this.flightsLoading = false
                }
            }
        ]
    },
    computed: {
        title: function () {
            return airportIata;
        },
        link: function () {
            return this.flightsSources[this.flightsSourceId].url[0];
        }
    },
    methods: {
        selectFlightsSource: function (index) {
            this.flightsSourceId = index
            this.flightsSources[index].htmldata.length == 0 && this.calc()
        },
        setOrderField: function (flightsSourceId,fieldName) {
            this.flightsSources[flightsSourceId].sortField = fieldName
            this.flightsSources[flightsSourceId].htmldata = sortData(this.flightsSources[flightsSourceId].htmldata,fieldName)
        },
        calc: calculateAll
    },
    mounted: calculateAll,
})

function calculateAll () {
    let currentFlightsSource = this.flightsSources[this.flightsSourceId]
    currentFlightsSource.flightsLoading = true
    if (currentFlightsSource.url) {
        currentFlightsSource.flightsChecked = currentFlightsSource.url.length
        currentFlightsSource.flightsTotal = currentFlightsSource.url.length*20
        let prepFlightsList = currentFlightsSource.url.map(el => axios.get(el)
                                                .then(response => {
                                                    currentFlightsSource.getFlights(response.data)
                                                }))
        axios.all(prepFlightsList)
            .then(() => {
                currentFlightsSource.flightsTotal = currentFlightsSource.htmldata.length
                sortData(currentFlightsSource.htmldata,currentFlightsSource.sortField)
                currentFlightsSource.getFlightsPages()
            })
    }
}

function sortData (dataSort,field) {
    return dataSort.sort((a, b) => {
        if (typeof a[field] !== 'undefined' && typeof b[field] !== 'undefined') {
            let flightA=a[field].toLowerCase()
            let flightB=b[field].toLowerCase()
            if (flightA < flightB) return -1
            if (flightA > flightB) return 1
        }
        return 0
       })
}

function to24h (time) {
    let timeArray = time.match(/(?:[^\d]|^)(\d{1,2}):(\d\d)[^ap]*([ap]m?)?(?:$|:|\b)/i)
    if (Array.isArray(timeArray) && timeArray.length>2) {
        let hours = Number(timeArray[1])
        let minutes = timeArray[2]
        if (timeArray[3]) {
            let AMPM = timeArray[3].substr(0,1).toLowerCase()
            if(AMPM == "p" && hours<12) hours = hours+12
            if(AMPM == "a" && hours==12) hours = 0
        }
        return (100+hours).toString().substr(1)+":"+minutes;
    }
    return '';
}