import { pdfOutputFile, roundsInfo } from './config.js';

export const toast = new bootstrap.Toast(message, { autohide: false });
export const toastAutohide = new bootstrap.Toast(message, { autohide: true, delay: 3000 });
const toastElement = document.getElementById('jsonToast');
export const toastImport = new bootstrap.Toast(toastElement);


export const showMessage = (msg, hide = true) => {
    const messageBody = document.getElementById('message-body');
    messageBody.innerHTML = msg;
    
    hide ? toastAutohide.show(): toast.show();
}

export const showImportDialog = () => {
    /* const toastElement = document.getElementById(dialog);
    const toast = new bootstrap.Toast(toastElement);
    toast.show(); */
    toastImport.show();
}

export const hideImportDialog = () => {
    toastImport.hide();
}

export const confirm = async (title, routine) => {
    showMessage(`
        <p>${title}</p>
        <button class="btn btn-light" onclick="${routine}()">Sí</button>
        `, false);
}

export const resetCollection = async (collection) => {
    if (localforage) {
        if (collection === 'all') {
            await localforage.clear();
        } else {
            await localforage.removeItem(collection);
        }

        location.reload();
    }
}

export const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

export const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

export const calculateTime = (current, delta, add = true) => {
    let [hours, minutes] = current.split(':').map(Number);

    if (add) {
        minutes += delta;

        hours += Math.floor(minutes / 60);
        minutes = minutes % 60;
    } else {
        minutes -= delta;

        while (minutes < 0) {
            minutes += 60;
            hours -= 1;
        }
    }

    hours = (hours % 24).toString().padStart(2, '0');
    minutes = minutes.toString().padStart(2, '0');

    const formatted = `${hours}:${minutes}`;

    return formatted;
}

export const export2PDF = async () => {
    toast.hide();

    var opt = {
        margin:       1,
        filename:     pdfOutputFile,
        image:        { type: 'png', quality: 0.98 },
        html2canvas:  { scale: 1 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    
    html2pdf().from(roundsInfo).set(opt).save();
}
