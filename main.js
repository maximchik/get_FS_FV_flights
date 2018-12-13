const urlParams = new URLSearchParams(window.location.search)
const airportIata = urlParams.get('iata')
const urlFlightStats = 'https://www.flightstats.com/go/weblet?guid=34b64945a69b9cac:4e54f19d:141251738d3:-17a3&weblet=status&action=AirportFlightStatus&airportCode='

var flightsCount = 0;

new Vue({
    el: '#app',
    data: {
        htmldata: [],
        termCount: 0,
        gateCount: 0,
        totallCount: 0,
        flightsToCheck: 0
    },
    computed: {
        title: function () {
            return airportIata;
        },
        link: function () {
            return urlFlightStats + airportIata;
        }
    },
    mounted: function () {
        axios.get(urlFlightStats + airportIata)
            .then(response => {
                this.htmldata = getLinksFromFlightStats(response.data)
                this.flightsToCheck = this.htmldata.length
                this.totallCount = this.flightsToCheck
                let dataArray = this.htmldata.map(element => 
                                    axios.get(element.href,{params:{el: element}})
                                        .then(response => {
                                            let result = countDataFromFlightStats(response.data)
                                            element.terminal = result.term
                                            element.gate = result.gate
                                            result.term && this.termCount++
                                            result.gate && this.gateCount++
                                        })
                                        .catch(error => {
                                            console.log(error)
                                        })
                                        .then(() => {
                                            this.flightsToCheck--
                                        })
                                )
                axios.all(dataArray)
                    .then(results => {
                        console.log("End res length: "+results.length)
                    })
            })
            .catch(error => {
                console.log(error)
            });
    }
})

var getLinksFromFlightStats = function (htmlSource) {
    return $('<span>' + htmlSource + '</span>')
            .find('.tableListingTable tr td:nth-child(1)')
            .slice(1)
            .filter((i,el) => $(el).text().indexOf("^") === -1)
            .map((i,el) => {return {
                                    href: $('a',el).attr('href'),
                                    flight: $(el).text().trim(),
                                    gate: '?',
                                    terminal: '?'
                                }
                    })
            .get()
}

var countDataFromFlightStats = function (htmlSource) {
    let hh = $('<span>' + htmlSource + '</span>').find('[class^="ticket__TerminalGateBagContainer"]')
    let term = hh.find('[class^="ticket__TGBSection"]:eq(0) > div:eq(1)').eq(0).text()
    let gate = hh.find('[class^="ticket__TGBSection"]:eq(1) > div:eq(1)').eq(0).text()
    return {gate: gate=='N/A'?null:gate, term: term=='N/A'?null:term}
}