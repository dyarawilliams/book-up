// const myCarouselElement = document.querySelector('#carouselExampleCaptions')

// const carousel = new bootstrap.Carousel(myCarouselElement, {
//     interval: 2000,
//     wrap: false
// })

const hamBurger = document.querySelector(".toggle-btn");

hamBurger.addEventListener("click", function () {
    document.querySelector("#sidebar").classList.toggle("expand");
});