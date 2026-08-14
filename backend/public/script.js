const bottone = document.getElementById('btnTest');
const risultato = document.getElementById('risultato');

bottone.addEventListener('click', () => {
    fetch('/api/projects')
        .then(response => {
            if (!response.ok) {
                throw new Error("Errore nella risposta del server");
            }
            return response.json(); // Estraiamo il body in formato JSON
        })
        .then(data => {
            risultato.style.color = "green";

            risultato.innerHTML = "<h3>Progetti estratti dal Database:</h3>";
            const lista = document.createElement('ul');

            data.forEach(progetto => {
                const item = document.createElement('li');
                item.innerHTML = `<strong>${progetto.title}</strong>: ${progetto.description} <em>(${progetto.status})</em>`;
                lista.appendChild(item);
            });

            risultato.appendChild(lista);
        })
        .catch(error => {
            risultato.innerText = "Errore di connessione al server o DB spento.";
            risultato.style.color = "red";
            console.error(error);
        });
});