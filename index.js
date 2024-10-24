import { roundsInfo } from './config.js';
import { toast, showMessage, showImportDialog, hideImportDialog, confirm, resetCollection, shuffleArray, timeToMinutes, calculateTime, export2PDF } from './utils.js';

const saveTeams = async () => {
    if (localforage) {
        await localforage.setItem('f2c_teams', teams);
        
        await showTeams();
    }
}

const saveContest = async () => {
    if (localforage) {
        await localforage.setItem('f2c_contest', contest);
        
        await showContest();
    }
}

const getTeams = async () => {
    if (localforage) {
        const data = await localforage.getItem('f2c_teams');
        await Array.prototype.push.apply(teams, data);
        
        await showTeams();
    }
}

const getContest = async () => {
    if (localforage) {
        const data = await localforage.getItem('f2c_contest');
        Object.assign(contest, data);
        
        await showContest();
    }
}

const showTeams = async () => {
    if (localforage) {
        teamsList.innerHTML = '';
        // while (teamsList.firstChild) teamsList.removeChild(teamsList.firstChild);

        if (teams.length > 0) {
            document.getElementById('teams-title').innerHTML = `Equipos (${teams.length})`;
            
            teams.forEach((item) => {
                const listItem = document.createElement('li');
                
                listItem.className = 'list-group-item d-flex justify-content-between align-items-start';
                listItem.innerHTML = `
                    ${item.id} ${item.pilot} / ${item.pitman} (${item.club} -> ${item.country})
                    <button class="btn btn-success badge" onclick="removeTeam('${item.id}')">X</button>
                `;
                
                teamsList.appendChild(listItem);
            });
        }
    }
}

const showContest = async () => {
    if (localforage) {
        for (const key of Object.keys(contest)) {
            const inputElement = document.getElementById(key);
            if (inputElement) inputElement.value = contest[key];
        }
    }
}

const addTeam = async (event) => {
    const data = {};
    let allDataOk = true;
    const formData = new FormData(event.target);
	
    for (let item of formData.entries()) {
        const name = item[0];
        const value = item[1].trim();

        if (value === null || value === undefined || value === '') {
            allDataOk = false;
            showMessage('Faltan datos en los campos');
            document.getElementById(name).focus();
            break;
        } else if ((name === 'pilot' || name === 'pitman') && !value.includes(',')) {
            allDataOk = false;
            showMessage('Respetar formato Apellido, Nombre para piloto y mecánico');
            document.getElementById(name).focus();
        } else {
            data[name] = value;
        }
    }

    if (allDataOk) {
        let nextId = 0;
        for (const team of teams) {
            const numericId = +team.id.substring(1);
            if (numericId > nextId) nextId = numericId;
        }
        nextId++;

        data.id = `T${(nextId).toString().padStart(2, '0')}`;
        teams.push(data);

        await saveTeams();

        return true;
    }

    return false;
}

const removeTeam = async (id) => {
    const index = teams.findIndex(item => item.id === id);
    if (index !== -1) teams.splice(index, 1);

    await saveTeams();
}

const updateContest = async (event) => {
    const formData = new FormData(event.target);
	
    for (let item of formData.entries()) {
        const name = item[0];
        const value = item[1].trim();
        contest[name] = value;
    }

    await saveContest();
}

const drawRounds = async () => {
    toast.hide();
    teams.forEach(team => team.maxcounter = 0 );
    
    const processDraw = (roundTeams) => {
        const races = [];
        const shuffledTeams = shuffleArray(roundTeams);
    
        for (let i = 0; i < shuffledTeams.length; i += TEAMS_PER_RACE) {
            const race = shuffledTeams.slice(i, i + TEAMS_PER_RACE);
            races.push(race);
        }
        return races;
    }
    
    const isValidIncompleteRace = (incompleteRace) => {
        return incompleteRace.every(team => {
            const index = teams.findIndex(item => item.id === team.id);
            return teams[index].maxcounter < contest.maxrepeatsinlast;
        });
    };
    
    const validateRound = (racesArr) => {
        const lastRace = racesArr.at(-1);
        if (lastRace.length < TEAMS_PER_RACE && !isValidIncompleteRace(lastRace)) return false;
        return true;
    };
    
    for (let i = 0; i < contest.heats; i++) {
        let round = [];
        let roundValid = false;

        while (!roundValid) {
            round = processDraw([...teams]);
            roundValid = validateRound(round);

            if (roundValid) {
                const lastRace = round.at(-1);
                lastRace.forEach(team => {
                    const index = teams.findIndex(item => item.id === team.id);
                    teams[index].maxcounter++;
                });
            }
        }

        rounds.push(round);
    }

    showAssistants();
    showPractices();
    showRounds();

    roundsInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const showAssistants = () => {
    htmlContent += `<div class="row">
        <h1 class="mt-5"><b>${contest.supervisor}</b></h1>
        <h1><b>${contest.organizer}</b></h1>
        <h1 class="mb-5"><b>${contest.contestname}</b></h1>
        <h2><b>F2C OFICIALES CONCURSO</b></h2>
        <h3>Director: ${contest.director}</h3>
        <h3>Jueces: 1- ${contest.judge1} | 2- ${contest.judge2} | 3- ${contest.judge3}</h3>
        <h4>Cronos / cuentavueltas:
            A- ${contest.counter1} / ${contest.counter2} |
            B- ${contest.counter3} / ${contest.counter4} |
            C- ${contest.counter5} / ${contest.counter6}
        </h4>
        <h5 class="mt-5"><b>El cronograma base es generado al azar digitalmente</b>,
        utilizando un algoritmo de mezcla y sorteo con control de repeticiones.</h5>
        
        <h5 class="mt-5"><b>Puede sufrir modificaciones por parte del Director</b>, si las
        considera necesarias para un <b>mejor cruce de equipos</b> en las primeras rondas,
        o en virtud de <b>complicaciones climáticas</b>.</h5>
    </div>`;
}

const showPractices = () => {
    htmlContent += '<div class="row page-break"><h2 class="mt-5"><b>F2C CRONOGRAMA PRACTICAS OFICIALES</b></h2></div>';

    const practicesGroups = [
        { round: 0, day: 1, shirtsCounter: 0, practiceCounter: 1, combinedHeats: [], startingTime: contest.startday1 },
        { round: 2, day: 2, shirtsCounter: 0, practiceCounter: 1, combinedHeats: [], startingTime: contest.startday2 }
    ];

    const drawHtml = (group) => {
        group.startingTime = calculateTime(group.startingTime, 30, false);
        for (const heat of rounds[group.round]) group.combinedHeats = group.combinedHeats.concat(heat);

        htmlContent += `<div class="row ${group.day === 1 ? '': 'page-break'}">
            <h4 ${group.day === 1 ? '': ' class="mt-5"'}>Día ${+contest.days === 1 ? '1': group.day}</h4>
            <ul class="list-group mb-5">`;

        for (let i = 0; i < group.combinedHeats.length; i++) {
            if (i % 2 === 0) htmlContent += `<h5 class="mt-3">Práctica ${group.practiceCounter}: ${group.startingTime} hs</h5>`;
            
            htmlContent += `<li class="list-group-item">${group.combinedHeats[i].id} <span class="badge ${shirts[group.shirtsCounter] === 'ROJ' ? 'bg-danger': shirts[group.shirtsCounter] === 'VDE' ? 'bg-success': 'bg-primary'} rounded-pill">_</span> ${group.combinedHeats[i].pilot} / ${group.combinedHeats[i].pitman}</li>`;
            group.shirtsCounter++;
            if (group.shirtsCounter === 3) group.shirtsCounter = 0;
            
            if (i % 2 === 0) {
                group.practiceCounter++;
                group.startingTime = calculateTime(group.startingTime, +contest.offpractice);
            }
        }
        
        htmlContent += `</ul></div>`;
    }

    practicesGroups.forEach(group => { drawHtml(group) });
}

const showRounds = () => {
    roundsInfo.innerHTML = '';
    
    htmlContent += '<div class="row page-break"><h2 class="mt-5"><b>F2C CRONOGRAMA ELIMINATORIAS</b></h2></div>';
    
    let currentDay = 1;
    let roundCounter = 1;
    let currentTime = calculateTime(contest.startday1, +contest.racesfreq, false);
    for (let round of rounds) {
        if (roundCounter === 3) {
            if (+contest.days === 1) {
                currentTime = calculateTime(currentTime, timeToMinutes(contest.roundsgap));
                currentTime = calculateTime(currentTime, +contest.racesfreq, false);
            } else {
                currentDay++;
                currentTime = calculateTime(contest.startday2, +contest.racesfreq, false);
                htmlContent += '<div class="row page-break"><h2 class="mt-5"><b>F2C CRONOGRAMA ELIMINATORIAS</b></div>';
            }
        }
        
        htmlContent += `<div class="row mt-3"><h2>Ronda ${roundCounter} (día ${currentDay})</h2></div>`;
        htmlContent += '<div class="row">';

        let serieCounter = 1;
        for (let heat of round) {
            currentTime = calculateTime(currentTime, +contest.racesfreq);
            
            htmlContent += '<div class="col-md-4">';
            htmlContent += `<div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">Serie ${serieCounter} (${currentTime} hs)</h5>
                    <ul id="list${serieCounter}" class="list-group" ondrop="drop(event)" ondragover="allowDrop(event)">`;
            
            for (let x = 0; x < 3; x++) {
                const assistants = x === 0 ? 'A': x === 1 ? 'B': 'C';
               
                if (heat[x] !== undefined) {
                    htmlContent += `<li class="list-group-item d-flex justify-content-between align-items-center">
                        <div class="fw-bold team-content"><span class="draggable" draggable="true" id="heat${serieCounter}${x}" ondragstart="drag(event)">${heat[x].id} ${heat[x].country} ${heat[x].pilot.split(',')[0].trim()}/${heat[x].pitman.split(',')[0].trim()}</span><br>(crono ${assistants})</div>
                        <span class="badge ${shirts[x] === 'ROJ' ? 'bg-danger': shirts[x] === 'VDE' ? 'bg-success': 'bg-primary'} rounded-pill" onclick="changeBadgeColor(this)" style="cursor: pointer;">_</span>
                    </li>`;
                }
            }
           
            serieCounter++;
            
            htmlContent += '</ul></div></div></div>';
        }

        htmlContent += '</div>';
        
        // Recordar asignar el innerHTML SOLO al tener el html completo
        roundsInfo.innerHTML = htmlContent;

        roundCounter++;
    }
}

const toggleDrawBtn = () => {
    bntDraw.disabled = teams.length < 4;
}

const toggleExportBtn = () => {
    bntExport.disabled = roundsInfo.innerHTML.trim() === '';
}

const allowDrop = (event) => {
    event.preventDefault();
}

const drag = (event) => {
    draggedItem = event.target;
    event.dataTransfer.setData("text", event.target.innerText);
}

const drop = (event) => {
    event.preventDefault();
    
    const droppedSpan = event.target;
    
    if (droppedSpan.tagName.toLowerCase() === 'span') {
        const draggedText = draggedItem.innerText;
        const droppedText = droppedSpan.innerText;
        
        draggedItem.innerText = droppedText;
        droppedSpan.innerText = draggedText;
    }
}

const changeBadgeColor = (item) => {
    if (item.classList.contains('bg-danger')) {
        item.classList.remove('bg-danger');
        item.classList.add('bg-success');
    } else if (item.classList.contains('bg-success')) {
        item.classList.remove('bg-success');
        item.classList.add('bg-primary');
    } else if (item.classList.contains('bg-primary')) {
        item.classList.remove('bg-primary');
        item.classList.add('bg-danger');
    }
}


// Main
const INSTALLABLE = false;
const TEAMS_PER_RACE = 3;

let deferredPrompt;
let htmlContent = '';
let rounds = [];
let draggedItem;

const teams = [];
const contest = {};
const shirts = ['ROJ', 'VDE', 'AZU'];
const teamForm = document.getElementById('team-form');
const contestForm = document.getElementById('contest-form');
const teamsList = document.getElementById('teams-List');
const bntDraw = document.getElementById('btn-draw');
const bntExport = document.getElementById('btn-export');
const installButton = document.getElementById('install-button');
const saveButton = document.getElementById('saveButton');

if ('serviceWorker' in navigator && INSTALLABLE) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
            console.log('Service Worker registered with scope:', registration.scope);
        }, function(err) {
            console.log('Service Worker registration failed:', err);
        });
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installButton.style.display = 'block';
    
    installButton.addEventListener('click', () => {
        installButton.style.display = 'none';
        deferredPrompt.prompt();
        
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('Instalación aceptada');
            } else {
                console.log('Instalación cancelada');
            }
            
            deferredPrompt = null;
        });
    });
});

teamForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    if (localforage) {
        if (await addTeam(event)) {
            teamForm.reset();
            document.getElementById('pilot').focus();
        }
    }
})

contestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    if (localforage) await updateContest(event);
    showMessage('Datos de concurso actualizados');
})

saveButton.addEventListener('click', async () => {
    try {
        const jsonText = document.getElementById('jsonTextarea').value;
        const jsonData = JSON.parse(jsonText);
        await localforage.setItem('f2c_teams', jsonData.teams);
        await localforage.setItem('f2c_contest', jsonData.contest);
        await getTeams();
        await getContest();
        hideImportDialog();
    } catch (err) {
        console.error('Error al importar:', err.message);
    }
})

const drawObserver = new MutationObserver(() => {
    toggleDrawBtn();
});
drawObserver.observe(teamsList, { childList: true, subtree: false, characterData: false });

const exportObserver = new MutationObserver(() => {
    toggleExportBtn();
});
exportObserver.observe(roundsInfo, { childList: true, subtree: true, characterData: true });

window.confirm = confirm;
window.drawRounds = drawRounds;
window.export2PDF = export2PDF;
window.resetCollection = resetCollection;
window.showImportDialog = showImportDialog;
window.removeTeam = removeTeam;
window.allowDrop = allowDrop;
window.drag = drag;
window.drop = drop;
window.changeBadgeColor = changeBadgeColor;

getTeams();
getContest();
toggleDrawBtn();
toggleExportBtn();
