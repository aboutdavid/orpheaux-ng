require('dotenv').config()
const fetch = require("node-fetch").default
const ical = require('ical');



module.exports = {
    isCalendarChannel: async function (channel) {
        const remotecal = await (await fetch(process.env.ICAL_URL)).text()
        var cal = ical.parseICS(remotecal);
        var i = 0;
        var sortedcal = Object.values(cal)
            .sort(function (a, b) {
                return new Date(b.end) - new Date(a.end);
            })
            .filter((a) => a.type == "VEVENT");
        const currentEvent = sortedcal.find(event => {
            const now = new Date();
            const start = new Date(event.start);
            const end = new Date(event.end);

            return now > start && now < end;
        });


        if (!currentEvent) return false
        else return currentEvent.description.includes(channel)

    },
    ongoingEvent: async function () {
        const remotecal = await (await fetch(process.env.ICAL_URL)).text()
        var cal = ical.parseICS(remotecal);
        var i = 0;
        var sortedcal = Object.values(cal)
            .sort(function (a, b) {
                return new Date(b.end) - new Date(a.end);
            })
            .filter((a) => a.type == "VEVENT");
        const currentEvent = sortedcal.find(event => {
            const now = new Date();
            const start = new Date(event.start);
            const end = new Date(event.end);

            return now > start && now < end;
        });


        return currentEvent ? true : false

    }
}

