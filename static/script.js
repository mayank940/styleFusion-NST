const contentImageInput = document.getElementById("FileInput1")
const styleImageInput = document.getElementById("FileInput2")
const contentImage = document.getElementById("contentImage")
const styleImage = document.getElementById("styleImage")
const contentUploadSection = document.getElementById("contentUploadSection")
const styleUploadSection = document.getElementById("styleUploadSection")
const contentRemoveBtn = document.getElementById("contentRemoveBtn")
const styleRemoveBtn = document.getElementById("styleRemoveBtn")


displayImage(contentImageInput, contentImage, contentUploadSection, contentRemoveBtn)
displayImage(styleImageInput, styleImage, styleUploadSection, styleRemoveBtn)

function displayImage(input, image, uploadSection, removeBtn){
    input.addEventListener("change", (e)=>{
        const file = e.target.files[0]

        if(file){
            const reader = new FileReader();
            reader.readAsDataURL(file)
            reader.addEventListener("load", (ev)=>{
                image.src = ev.target.result
                uploadSection.style.display = "none"
                image.style.display = "block"
                removeBtn.style.display = "inline"
            })
        }
    })
}

handleDrop(contentImageInput, contentImage, contentUploadSection, contentRemoveBtn)
handleDrop(styleImageInput, styleImage, styleUploadSection, styleRemoveBtn)

document.addEventListener("dragover", (e)=>{
    e.preventDefault()
})

document.addEventListener("drop", (e)=>{
    e.preventDefault()
})

function handleDrop(input, image, uploadSection, removeBtn){

    uploadSection.addEventListener("dragover", (e)=>{
        e.preventDefault()
    })

    uploadSection.addEventListener("drop", (e)=>{
        e.preventDefault()
        const file = e.dataTransfer.files[0]

        if (file && file.type.startsWith("image/")){
            const dataTransfer = new DataTransfer()
            dataTransfer.items.add(file)
            input.files = dataTransfer.files

            const fileReader = new FileReader()
            fileReader.readAsDataURL(file)

            fileReader.addEventListener("load", (ev)=>{
                // console.log(ev.target.result)
                image.src = ev.target.result 
                image.style.display = "block"
                uploadSection.style.display = "none"
                removeBtn.style.display = "inline"
            })
        }
        else{
            showNotification("Uplaod an image")
        }
    })

}

removeImage(contentRemoveBtn, contentImage, contentImageInput, contentUploadSection)
removeImage(styleRemoveBtn, styleImage, styleImageInput, styleUploadSection)

function removeImage(removeBtn, image, imageInput, uploadSection){

    removeBtn.addEventListener("click", (e)=>{
        imageInput.value = ""
        image.src = "#"
        image.style.display = "none"
        uploadSection.style.display = "block"
        removeBtn.style.display = "none"
    })
}

const form = document.getElementById("uploadForm")

form.addEventListener("submit", async (e)=>{
    e.preventDefault()
    
    const submitBtn = document.getElementById("submitBtn")
    submitBtn.disabled = true

    
    if (contentImageInput.files.length == 0){
        showNotification("Content image not uploaded")
        submitBtn.disabled = false
        return
    }
    
    if (styleImageInput.files.length == 0){
        showNotification("Style image not uploaded")
        submitBtn.disabled = false
        return
    }
    
    const formData = new FormData(form)
    const resPreview  = document.getElementById("resPreview")
    const loader = document.getElementById("loader")

    showNotification("Generating image...", "status")
    resPreview.style.opacity = "0.6"
    resPreview.style.filter = "blur(6px)"
    loader.style.display = "inline"

    try{
        let res = await fetch("/",{
            method: "POST",
            body : formData
        })

        if(res.ok){
            
            const data = await res.json()
            const error = data.error
            
            const b64Image = data.result_image
            const resultPlaceholder = document.getElementById("resultPlaceholder")

            if(b64Image){
                const resultImage = document.getElementById("resultImage")
                const imageModal = document.getElementById("imageModal")

                resultImage.src = `data:image/png;base64,${b64Image}`
                imageModal.src = `data:image/png;base64,${b64Image}`

                resultImage.classList.remove("d-none")
                resultImage.classList.add("d-block")
                resultPlaceholder.classList.add("d-none")
            }
            
            if(error){
                showNotification(error)
            }
            else{
                showNotification("<i class='bi bi-check-circle-fill'></i> Your image is ready", "success")
            }
        }
    }
    catch(error){
        showNotification("Internal server error")
        console.log(error)
    }
    finally{
        submitBtn.disabled = false
        resPreview.style.opacity = "1"
        resPreview.style.filter = "blur(0)"
        loader.style.display = "none"
    }
    
    submitBtn.disabled = false
    return 
    
})

const downloadBtn = document.getElementById("downloadBtn")
downloadBtn.addEventListener("click", async(e) =>{

    const imageSrc = document.getElementById("resultImage").src

    if(imageSrc.split("/").at(-1)){

        const imageName = "Generated_image"

        const img =  await fetch(imageSrc)
        const blob = await img.blob()
        const blobUrl = URL.createObjectURL(blob)
    
        const link = document.getElementById("downloadLink")
        link.href = blobUrl
        link.download = imageName
        link.click()
        
        URL.revokeObjectURL(blobUrl)
    }

    return
})

const shareBtn = document.getElementById("shareBtn")
shareBtn.addEventListener("click", async (e)=>{
    const imageUrl = document.getElementById("resultImage").src

    if (imageUrl.startsWith("http")){
        return 
    }

    try{
        // get MIME type and base64 image
        const parts = imageUrl.split(";base64,")
        const mimeType = parts[0].split(":")[1]
        const rawBase64 = parts[1]

        //convert base64 data into binary data(Blob)
        const raw = window.atob(rawBase64)
        const rawLength = raw.length
        const uInt8Arr = new Uint8Array(rawLength)

        for (let i = 0; i < rawLength; ++i){
            uInt8Arr[i] = raw.charCodeAt(i)
        }

        const blob = new Blob([uInt8Arr], {"type" : mimeType})

        // create a file object from binary data
        const extension = mimeType.split("/")[1]
        const file = new File([blob], `Generated_image.${extension}`, {"type" : mimeType})

        // trigger native webshare
        if(navigator.canShare && navigator.canShare({ files: [file] })){
            await navigator.share({
                files : [file],
                title : "Check out this image",
                text : "Look at this picture"
            });
            console.log("Done")
        }
        else{
            alert("Native sharing is not supported on this device/browser")
        }
    }
    catch(error){
        console.error("Error sharing this image:", error)
        alert("Failed to share the image")
    }

})

const modalContainer = document.getElementById("modalContainer")
const closeBtn = document.getElementById("closeBtn")
const expandBtn = document.getElementById("expandBtn")
const extensions = [".jpg", ".png", ".jpeg"]

expandBtn.addEventListener("click", ()=>{
    const resultImageUrl = document.getElementById("resultImage").src
    if(extensions.some(ext => resultImageUrl.endsWith(ext)) || resultImageUrl.startsWith("data:image/") ){
        modalContainer.classList.remove("d-none")
        modalContainer.classList.add("d-flex")
    }
})

modalContainer.addEventListener("click", (e)=>{
    if(e.target === modalContainer){
        modalContainer.classList.remove("d-flex")
        modalContainer.classList.add("d-none")
    }
})

closeBtn.addEventListener("click", ()=>{
    modalContainer.classList.remove("d-flex")
    modalContainer.classList.add("d-none")
})

function showNotification(message, type="error"){
    let container = document.querySelector(".toast-container")
    if (!container){
        container = document.createElement("div")
        container.className = "toast-container position-fixed top-0 end-0 p-3"
        document.body.appendChild(container)
    }
    
    let bgClass 
    let livePriority 
    
    switch (type){
        case "error":
            bgClass = "text-bg-danger"
            livePriority = "assertive"
            break
            
        case "success":
            bgClass = "text-bg-success"
            livePriority = "polite"
            break
            
        case "status":
            bgClass = "sf-bg-secondary"
            livePriority = "polite"
            break
        }

    const toastHtml = `
        <div class="toast ${bgClass}" role="alert" aria-live="${livePriority}" aria-atomic="true">
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        </div>
    `

    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = toastHtml.trim()
    const toastElement = tempDiv.firstChild
    container.appendChild(toastElement)

    const toastInstance = new bootstrap.Toast(toastElement, {delay : 2500})
    toastInstance.show()

    toastElement.addEventListener("hidden.bs.toast", ()=>{
        toastElement.remove()
    })
}
