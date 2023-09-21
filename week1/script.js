
let srcLinks, audioElNo = 50, audioElLoadedNo = 0, audioElements = []
let couldFetch = false, speed = 1000, isPlaying = false
let loadingElem, websiteURL, resultElem, seed = 123512

const files = [
    '/week1/audio/188828__0ktober__modem_dial.wav', 
    '/week1/audio/546450__wtermini__the-sound-of-dial-up-internet.mp3', 
    '/week1/audio/644997__goldenzoomi1__the-microsoft-sound.wav']

S = () => { return (1664525 * seed + 1013904223) % (2 ** 32) / (2 ** 32)}

(function() {
    // Parameters for a simple linear congruential generator
    const a = 1664525;
    const c = 1013904223;
    const m = 2 ** 32; // modulus: 2^32

    let seed = 12345678

    function lcgRandom() {
        seed = (a * seed + c) % m;
        return seed / m;
    }

    // Override Math.random() with the seedable lcgRandom
    Math.random = lcgRandom;

    // Function to set the seed
    Math.setSeed = function(s) {
        seed = s;
    };
})()

async function extractSrcLinks() {
    try {
        const response = await fetch(`https://corsproxy.io/?${websiteURL.value}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })

        if (!response.ok) {
            couldFetch = false
            throw new Error("Ooops, couldn't fetch 🙅🏼")
        }

        const htmlContent = await response.text()

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html')

        const srcTags = doc.querySelectorAll('[src]')
        srcLinks = [...srcTags].map(tag => {
            return tag.getAttribute('src')
        })

        resultElem.innerHTML = srcLinks.map(link => `<a href="${link}">${link}</a>`).join('<br>')

        if(srcLinks != undefined && srcLinks.length > 1) {
            audioElements = []
            Math.setSeed(srcLinks.length * srcTags.length)
            for(let i=0; i<audioElNo; i++) {
                createAudioElement(i)
            }
            couldFetch = true
        } else {
            throw new Error("Nothing found 😟")
        }
    } catch (error) {
        couldFetch = false
        resultElem.textContent = error.message
    }
}

function createAudioElement(index) {
    let audio = document.createElement('audio')
    audio.src = files[Math.floor(Math.random() * files.length)]
    // audio.controls = true
    audio.volume = 2.5/audioElNo
    audio.loop = true
    document.body.appendChild(audio)
    audioElements.push({
        audioEl: audio,
        link: srcLinks[Math.floor(Math.random() * (srcLinks.length - 1))],
        currentIndex: 0
    })
}

function play() {
    isPlaying = !isPlaying
}

window.onload = function() {
    loadingElem = document.getElementById('loading')
    websiteURL = document.getElementById('websiteURL')
    resultElem = document.getElementById('result')
    Math.setSeed(12345678)
    setInterval(update, speed);
  };


function update() {
    console.log("update")
    if (couldFetch == false || isPlaying == false) {
        for(let i=0; i<audioElNo; i++) {
            if (audioElements[i] != undefined) {
                audioElements[i].audioEl.pause()
            }
        }
        return
    }
    audioElLoadedNo = 0
    for(let i=0; i<audioElNo; i++) {
        if(audioElements[i].audioEl.readyState != 4) {
            continue
        }
        if(audioElements[i].currentIndex >= audioElements[i].link.length) {
            audioElements[i].currentIndex = 0
        }
        playSegment(audioElements[i].audioEl, audioElements[i].link[audioElements[i].currentIndex])
        audioElements[i].currentIndex++
        audioElLoadedNo++;
    }
    loadingElem.textContent = audioElLoadedNo/audioElNo * 100 + "% loaded"
}

function playSegment(audioEl, character) {
    const segmentDuration = audioEl.duration / 26
    const charPosition = character.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0)

    if (charPosition >= 0 && charPosition <= 25 && Math.random() > 0.5) {
        const startTime = charPosition * segmentDuration
    
        audioEl.currentTime = startTime
        audioEl.play()
    } else {
        audioEl.pause()
    }
}