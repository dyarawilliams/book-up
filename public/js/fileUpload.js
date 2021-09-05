document.addEventListener('DOMContentLoaded', function() {

    // Register plugins 
    FilePond.registerPlugin(
        FilePondPluginImagePreview,
        FilePondPluginImageResize,
        FilePondPluginFileEncode,
    );

    console.log('filepond registered')
    
    // Create FilePond object
    const inputElement = document.querySelector('input[type="file"]');
    const pond = FilePond.create(inputElement);
    
    FilePond.parse(document.body);
});
