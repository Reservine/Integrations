<style lang="scss">

</style>


<script lang="ts">


  console.log("im working")

  let reservationUrl = 'https://localhost:1111';

  let branchId = 1;

  if (branchId) {
    reservationUrl += '/branch/' + branchId;
  }


</script>


<body class="flex h-svh w-svw items-center justify-center flex-col gap-5 text-center bg-slate-800">

<reservine-button buttonText="Ahooj custom text" reservationUrl="https://localhost:1111/branch/1"></reservine-button>

</body>












