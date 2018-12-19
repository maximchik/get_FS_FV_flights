const CancelToken = axios.CancelToken
const source = CancelToken.source()
const urlParams = new URLSearchParams(window.location.search)
const airportIata = urlParams.get('iata')
const localTimeUrl = "https://www.flightstats.com/v2/api/airport/"+airportIata+"?rqid="+Math.random()

var flightsCount = 0;

new Vue({
    el: '#app',
    data: {
        localTime: null,
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
//https://www.flightstats.com/v2/flight-tracker/TK/161?year=2018&month=12&date=17&flightId=983637517&utm_source=34b64945a69b9cac:4e54f19d:141251738d3:-17a3&utm_medium=cpc&utm_campaign=weblet                            
//https://www.flightstats.com/v2/api-next/flight-tracker/LX/4049/2018/12/17/983615798?rqid=bda2vcbp7aj
                            let flightNum = $('td:nth-child(1)',el).text().trim()
                            let flightLnk = $('td:nth-child(1) a',el).attr('href')
                            let flightId = flightLnk.match(/flightId=(\d+)/i)[1]
                            let flightNm = flightLnk.match(/tracker\/(.+?)\?/i)[1]
                            let flightYear = flightLnk.match(/year=(\d+)/i)[1]
                            let flightMonth = flightLnk.match(/month=(\d+)/i)[1]
                            let flightDay = flightLnk.match(/date=(\d+)/i)[1]

                            if (!this.htmldata.find(el =>el.flight == flightNum)) {
                                this.htmldata.push({
                                            href: "https://www.flightstats.com/v2/api-next/flight-tracker/"
                                                    +flightNm+"/"
                                                    +flightYear+"/"
                                                    +flightMonth+"/"
                                                    +flightDay+"/"
                                                    +flightId +"/"
                                                    +"?rqid="+Math.random(),
                                            linkToFlight: flightLnk,
                                            flight: flightNum,
                                            time: to24h($('td:nth-child(4) a',el).text().trim()),
                                            timeActual: '?',
                                            gate: '?',
                                            terminal: '?',

                                })
                            }
                        })
                },
                getFlightsPages: function () {
                    let dataArray = this.htmldata.map(element => 
                        axios.get(element.href,{cancelToken: source.token})
                            .then(response => {
                                let statusTmp = ''
                                let flightData = response.data.data
                                let timeTmp = flightData.departureAirport.times.scheduled.time24
                                let timeActualTmp = flightData.departureAirport.times.estimatedActual.time24
                                if (isDelayed(timeTmp,timeActualTmp)) statusTmp = 'delayed'
                                if (flightData.flightNote.canceled) statusTmp = 'cancelled'
                                element.gate = flightData.departureAirport.gate
                                element.terminal = flightData.departureAirport.terminal
                                element.timeActual = timeActualTmp
                                element.status = statusTmp
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
                    let lastTime = "00:00"
                    let nextDay = ""
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
                            let statusTmp = ''
                            let timeTmp = to24h($('td:nth-child(5)',el).text())
                            let timeActualTmp = to24h($('td:nth-child(6)',el).text())
                            if (isDelayed(timeTmp,timeActualTmp)) statusTmp = 'delayed'
                            if ($('.c4',el).text().match(/cancel/i)) statusTmp = 'cancelled'
                            this.flightsChecked++
                            if (timeTmp < lastTime) {
                                nextDay = ">"
                            }
                            lastTime = timeTmp

                            this.htmldata.push({
                                        href: '',
                                        linkToFlight: 'https://tracker.flightview.com'+$('[id^="ffFormShowIndividual"]',el).eq(0).attr('action'),
                                        flight: $('.c1',el).text().match(/"(.+)"/i )[1]+" "+$('.c2',el).text().trim(),
                                        time: nextDay + timeTmp,
                                        timeActual: timeActualTmp,
                                        status: statusTmp,
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
        stopLoading: function(flightsSourceId) {
            this.flightsSources[flightsSourceId].flightsLoading = false
            source.cancel()
        },
        flightNumberHtml: function(flight) {
            let htmlStr = flight.flight;
            if (flight.status === 'cancelled') {
                htmlStr = '<del><strong>'+htmlStr+'</strong></del>'
            }
            if (flight.linkToFlight) {
                htmlStr = '<a href="'+flight.linkToFlight+'">'+htmlStr+'</a>'
            }
            return htmlStr
        },
        calc: calculateAll
    },
    created: getLocalTime,
    mounted: calculateAll,
})

function getLocalTime () {
    console.log(localTimeUrl)
    axios.get(localTimeUrl)
        .then(response => {
            console.log(response.data)
            this.localTime = response.data.detailsHeader.currentTime
        })
}

function calculateAll () {
    let currentFlightsSource = this.flightsSources[this.flightsSourceId]
    if (currentFlightsSource.url) {
        currentFlightsSource.flightsChecked = 0
        currentFlightsSource.flightsTotal = 0 // currentFlightsSource.url.length
        let prepFlightsList = currentFlightsSource.url.map(el => axios.get(el)
                                                .then(response => {
                                                    currentFlightsSource.getFlights(response.data)
                                                }))
        axios.all(prepFlightsList)
            .then(() => {
                currentFlightsSource.flightsLoading = true
                currentFlightsSource.flightsTotal = currentFlightsSource.htmldata.length
                sortData(currentFlightsSource.htmldata,currentFlightsSource.sortField)
                currentFlightsSource.getFlightsPages()
            }).catch(function (thrown) {
                if (axios.isCancel(thrown)) {
                    console.log('Request canceled', thrown.message);
                } else {
                    console.log('Request error', thrown.message);
                }
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

function isDelayed(t1,t2) {
    return t2>t1
}