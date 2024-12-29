document.addEventListener('DOMContentLoaded', function() {

    // Register plugins 
    FilePond.registerPlugin(
        FilePondPluginImagePreview,
        FilePondPluginImageResize,
        FilePondPluginFileEncode,
    );

    console.log('filepond registered')

    FilePond.setOptions({
        stylePanelAspectRatio: 85 / 100,
        imageResizeTargetWidth: 100,
        imageResizeTargetHeight: 150,
        // imagePreviewHeight: 100,
    })
    
    // Create FilePond object
    const inputElement = document.querySelector('input[type="file"]');
    const pond = FilePond.create(inputElement);
    
    FilePond.parse(document.body);
});


// Dashboard JS

// const hamBurger = document.querySelector(".toggle-btn");

// hamBurger.addEventListener("click", function () {
//     document.querySelector("#sidebar").classList.toggle("expand");
// });