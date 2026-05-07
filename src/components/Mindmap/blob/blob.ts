export const blob = (data: any,  mime: any) => {
  data = data.split(',')[1];
  data = window.atob(data);
  let ia = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
      ia[i] = data.charCodeAt(i);
  };
  return new Blob([ia], {
      type: mime
  });
}