const myCarouselElement = document.querySelector('#carouselExampleCaptions')

const carousel = new bootstrap.Carousel(myCarouselElement, {
    interval: 2000,
    wrap: false
})