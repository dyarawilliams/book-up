const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const loginCard = document.getElementById('login-card');

signUpButton.addEventListener('click', () => {
    console.log('Card Clicked Now Let Us Slide')
    loginCard.classList.add('right-panel-active');
    console.log('Card Slide Fasho')
})

signInButton.addEventListener('click', () => {
    console.log('Card Clicked')
    loginCard.classList.remove('right-panel-active');
    console.log('Card Slide Remove')
})