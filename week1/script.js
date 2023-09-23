let srcLinks, audioElNo = 10, audioElLoadedNo = 0, audioElements = []
let couldFetch = false, speed = 2000, isPlaying = false
let loadingElem, websiteURL, resultElem, seed = 123512

const files = [
    '/week1/audio/188828__0ktober__modem_dial.wav', 
    '/week1/audio/546450__wtermini__the-sound-of-dial-up-internet.mp3', 
    '/week1/audio/644997__goldenzoomi1__the-microsoft-sound.wav']

function setupDetRand() {
    let seed = 12345678
    function lcgRandom() {
        seed = (1664525 * seed + 1013904223) % (2 ** 32)
        return seed / (2 ** 32)
    }
    Math.random = lcgRandom;
    Math.setSeed = function(s) {
        seed = s;
    }
}
setupDetRand()

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

        removeAudioElements()

        const srcTags = doc.querySelectorAll('[src]')
        srcLinks = [...srcTags].map(tag => {
            return tag.getAttribute('src')
        })

        resultElem.innerHTML = srcLinks.map(link => `<a href="${link}">${link}</a>`).join('<br>')

        if(srcLinks != undefined && srcLinks.length > 1) {
            Math.setSeed(srcLinks.length * srcTags.length)
            for(let i=0; i<audioElNo; i++) {
                createAudioElement()
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

function createAudioElement() {
    let audio = document.createElement('audio')
    console.log()
    audio.src = files[Math.floor(Math.random() * files.length)]
    audio.volume = 2.5/audioElNo
    audio.loop = true
    document.body.appendChild(audio)
    audioElements.push({
        audioEl: audio,
        link: srcLinks[Math.floor(Math.random() * (srcLinks.length - 1))],
        currentIndex: 0
    })
}

function removeAudioElements() {
    isPlaying = false
    for(let i=0; i<audioElNo; i++) {
        if(audioElements.length > 0 && audioElements[i].audioEl != undefined) {
            audioElements[i].audioEl.remove()
        }
    }
    audioElements = []
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
        // loadingElem.textContent = audioElLoadedNo/audioElNo * 100 + "% loaded"
        if(audioElements[i].audioEl.readyState != 4) {
            continue
        }
        if(audioElements[i].currentIndex >= audioElements[i].link.length) {
            audioElements[i].currentIndex = 0
        }
        playSegment(audioElements[i].audioEl, audioElements[i].link[audioElements[i].currentIndex])
        audioElements[i].currentIndex++
        audioElLoadedNo++
    }
}

function playSegment(audioEl, character) {
    const segmentDuration = audioEl.duration / 26
    const charPosition = character.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0)

    if (charPosition >= 0 && charPosition <= 25 && Math.random() > 0.15) {
        const startTime = charPosition * segmentDuration
    
        audioEl.currentTime = startTime
        audioEl.play()
    } else {
        audioEl.pause()
    }
}