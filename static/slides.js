function switch_slide(direction) {
  slides = document.getElementById('slides').getElementsByClassName("slide");
  navs = document.getElementsByClassName("nav-link");
  
  for (var i = 0; i < slides.length; i++) {
    // 找到class包含active的slide的序号
    if (slides[i].classList.contains("active")) {
      if (direction == 'prev') {
        var new_i = i > 0 ? i - 1 : slides.length - 1
      }
      else if (direction == 'next') {
        var new_i = i < slides.length - 1 ? i + 1 : 0
      }

      slides[i].classList.toggle("active");
      slides[new_i].classList.toggle("active");
      navs[i].classList.toggle("active");
      navs[new_i].classList.toggle("active");
      break; // Stop once we find the first one
    }
  }

  // var scrollContainer = document.getElementById('slides');
  // slides.forEach((entry, index){
  //   console.log(entry.target)
  //   if (direction == 'prev') {
  //     var new_index = index > 0 ? index - 1 : entries.length - 1
  //   }
  //   else if (direction == 'next') {
  //     var new_index = index < entries.length - 1 ? index + 1 : 0
  //   }
  // }
  // var activated = document.getElementsByClassName("slide activate");

  // var slides = scrollContainer.querySelectorAll('.slide')
  // // 定义Intersection Observer回调函数
  // const observerCallback = (entries) => {
  //   entries.forEach((entry, index) => {
  //     // get current visible slide
  //     if (entry.isIntersecting) {
  //       console.log(entry.target)
  //       if (direction == 'prev') {
  //         var new_index = index > 0 ? index - 1 : entries.length - 1
  //       }
  //       else if (direction == 'next') {
  //         var new_index = index < entries.length - 1 ? index + 1 : 0
  //       }

  //       entries[new_index].target.scrollIntoView({ behavior: 'smooth',inline: 'start'});
  //       entries[index].classList.toggle("active");
  //       entries[new_index].classList.toggle("active");
  //     }
  //   });
  // };

  // // 创建Intersection Observer实例
  // const observer = new IntersectionObserver(observerCallback, {
  //   root: scrollContainer, // 默认是视口
  //   threshold: 1 // 当元素100%可见时触发
  // });

  // // 观察所有section元素
  // slides.forEach(slide => {
  //   observer.observe(slide);
  // });
}

document.getElementById('goto-prev').addEventListener('click', function() {
  switch_slide('prev');
})
document.getElementById('goto-next').addEventListener('click', function() {
  switch_slide('next');
})

document.addEventListener("DOMContentLoaded", function () {
    const pointers = document.querySelectorAll("[id^='slide'][id$='_pointer']");

    pointers.forEach(pointer => {
        pointer.addEventListener("click", function () {
            const id = this.id.match(/^slide(\d+)_pointer$/);
            if (id) {
                const index = id[1];

                // 获取所有 pointer 和 slide
                const allPointers = document.querySelectorAll("[id^='slide'][id$='_pointer']");
                const allSlides = document.querySelectorAll("[id^='slide']:not([id$='_pointer'])");

                // 移除所有 active
                allPointers.forEach(p => p.classList.remove("active"));
                allSlides.forEach(s => s.classList.remove("active"));

                // 添加 active 到当前 pointer 和对应 slide
                this.classList.add("active");
                const slide = document.getElementById(`slide${index}`);
                if (slide) {
                    slide.classList.add("active");
                }
            }
        });
    });
});