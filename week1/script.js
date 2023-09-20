
let srcLinks
let audioElNo = 1
let audioElements = []
let couldFetch = false
let speed = 500
let isPlaying = false
let audioElLoadedNo = 0
let loadingElem, websiteURL, resultElem
const files = ['/week1/audio/188828__0ktober__modem_dial.wav', '/week1/audio/546450__wtermini__the-sound-of-dial-up-internet.mp3', '/week1/audio/644997__goldenzoomi1__the-microsoft-sound.wav']

async function extractSrcLinks() {
    try {
        const response = await fetch(`https://corsproxy.io/?${websiteURL.value}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            couldFetch = false
            throw new Error("Ooops, couldn't fetch")
        }

        const htmlContent = await response.text()

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html')
        // Extract all src attribute
        const srcTags = doc.querySelectorAll('[src]')
        srcLinks = [...srcTags].map(tag => {
            return tag.getAttribute('src')
        })

        // Display the links
        resultElem.textContent = srcLinks;

        if(srcLinks != undefined && srcLinks.length > 1) {
            audioElements = []
            for(let i=0; i<audioElNo; i++) {
                createAudioElement(i)
            }
            couldFetch = true
            console.log(audioElements)
        }
    } catch (error) {
        couldFetch = false
        resultElem.textContent = "Ooops, couldn't fetch"
    }
}

function createAudioElement(index) {
    let audio = document.createElement('audio')
    audio.src = files[Math.floor(Math.random() * files.length)]
    audio.controls = true
    audio.volume = 1/audioElNo
    audio.loop = true
    document.body.appendChild(audio)
    audioElements.push({
        audioEl: audio,
        src: srcLinks[Math.floor(Math.random() * (srcLinks.length - 1))],
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
    setInterval(update, speed);
  };


function update() {
    if (couldFetch == false || isPlaying == false) {
        return
    }
    audioElLoadedNo = 0
    for(let i=0; i<audioElNo; i++) {
        if(audioElements[i].audioEl.readyState != 4) {
            continue
        }
        if(audioElements[i].currentIndex >= audioElements[i].src.length) {
            audioElements[i].currentIndex = 0
        }
        playSegment(audioElements[i].audioEl, audioElements[i].src[audioElements[i].currentIndex])
        audioElements[i].currentIndex++
        audioElLoadedNo++;
    }
    resultElem.textContent = audioElLoadedNo/audioElNo * 100 + "% loaded"
}

function playSegment(audioEl, character) {
    const segmentDuration = audioEl.duration / 26;
    const charPosition = character.charCodeAt(0) - 'a'.charCodeAt(0);  // 0 for 'a', 1 for 'b', etc.

    const startTime = charPosition * segmentDuration;
    
    audioEl.currentTime = startTime;
    audioEl.play();
}