const bottone = document.getElementById('btnTest');
const risultato = document.getElementById('risultato');

bottone.addEventListener('click', () => {

    fetch('/api/saluto')
        .then(response => response.text())
        .then(data => {
            risultato.innerText = data;
            risultato.style.color = "green";
        })
        .catch(error => {
            risultato.innerText = "Errore di connessione al server.";
            risultato.style.color = "red";
        });

});