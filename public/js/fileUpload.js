document.addEventListener('DOMContentLoaded', function() {

    // Register plugins 
    FilePond.registerPlugin(
        FilePondPluginImagePreview,
        FilePondPluginImageResize,
        FilePondPluginFileEncode,
    );

    console.log('filepond registered')

    FilePond.setOptions({
        stylePanelAspectRatio: 150 / 100,
        imageResizeTargetWidth: 100,
        imageResizeTargetHeight: 150

    })
    
    // Create FilePond object
    const inputElement = document.querySelector('input[type="file"]');
    const pond = FilePond.create(inputElement);
    
    FilePond.parse(document.body);
});
