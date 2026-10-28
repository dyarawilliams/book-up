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
        // The server also caps uploads at 600px. Keep the client resize in that box
        // so the encoded form field is not a full-resolution photo.
        imageResizeTargetWidth: 600,
        imageResizeTargetHeight: 800,
        imageResizeMode: 'contain',
        imageResizeUpscale: false,
    })
    
    // Create FilePond object
    const inputElement = document.querySelector('input[type="file"]');
    if (!inputElement || typeof FilePond === 'undefined') return
    FilePond.create(inputElement);
    FilePond.parse(document.body);
});