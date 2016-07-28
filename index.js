const fetch = require('node-fetch');
const Promise = require('bluebird');
const _ = require('lodash');
const geolib = require('geolib');
const LRU = require('lru-cache');

const cache = LRU(5000);

const origin = { latitude: 36.1186828, longitude: -97.1203189 };

const places = require('./places');
const exclude = require('./exclude');
const include = require('./include');

function getNamedLocation(coords) {
    const distance = geolib.getDistance(origin, coords);

    if (distance > 250) {
        return "It's a long way away..";
    }

    return "It's close to " + _.reduce(places, (memo, place) => {
        const distance = geolib.getDistance(place, coords);

        if (distance < memo.distance) {
            return _.assign({}, place, { distance });
        }

        return memo;
    }, { name: 'a black hole', distance: Infinity }).name;
}

const makerEndpoint = `https://maker.ifttt.com/trigger/${process.env.IFTTT_TRIGGER}/with/key/${process.env.IFTTT_KEY}`;
const apiEndpoint = process.env.API_ENDPOINT;

function fetchPokemon() {
    return Promise.resolve(fetch(`${apiEndpoint}/raw_data`).then((response) => response.json()))
        .get('pokemons')
        .filter(({ pokemon_id }) => !_.includes(exclude, pokemon_id))
        .filter(({ latitude, longitude, pokemon_id }) => geolib.getDistance(origin, { latitude, longitude }) < 250 || _.includes(include, pokemon_id))
        .filter(({ encounter_id }) => !cache.has(encounter_id));
}

function populateCache() {
    return fetchPokemon().map((pokemon) => cache.set(pokemon.encounter_id, pokemon));
}

const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
};

function poll() {
    return fetchPokemon()
        .map((pokemon) => {
            const location = getNamedLocation({ latitude: pokemon.latitude, longitude: pokemon.longitude });

            const body = JSON.stringify({
                value1: `${pokemon.pokemon_name}!\n${location}.`,
                value2: `https://www.google.com/maps/dir/Current+Location/${pokemon.latitude},${pokemon.longitude}`,
                value3: `${apiEndpoint}/static/icons/${pokemon.pokemon_id}.png`
            });

            console.log(body);

            return fetch(makerEndpoint, { method: 'POST', headers, body })
                .then(() => cache.set(pokemon.encounter_id, pokemon))
        })
        .catch(_.noop); // surpress errors
}

populateCache();

setInterval(poll, 5000);
