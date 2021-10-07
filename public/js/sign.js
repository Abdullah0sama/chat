
const form = document.querySelector('form');
const alertForm = document.querySelector('.alert-form');

function submitForm (event, target, redirect) {
    event.preventDefault();
    alertForm.classList.add('d-none');
    const data = new URLSearchParams( new FormData(event.target) );
        fetch(target, {
        method: 'POST',
        body: data
    })
    .then ( (response) => {
        if (response.status == 200) window.location = redirect;
        else return response.json();
    })
    .then( (res) => {
        changeAlert(res.msg);
    }).catch (err => console.log(err));
}

function changeAlert(textAlert) {
    alertForm.innerHTML = textAlert;
    alertForm.classList.remove('d-none');
}